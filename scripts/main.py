import os
from pathlib import Path
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process

# Load environment variables
load_dotenv()

# ==============================================================================
# LLM Provider Selection (Gemini default, OpenAI for complex tasks)
# ==============================================================================

def get_llm():
    """Get LLM based on LLM_PROVIDER env var."""
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    if provider == "openai":
        # OpenAI (GPT-4o)
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o")
    else:
        # Gemini (free tier)
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-exp",
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )

LLM = get_llm()

# ==============================================================================
# Memory Store (Supabase dev.* schema)
# ==============================================================================

class MemoryStore:
    """Persistent memory for agents using Supabase dev.* schema."""
    
    def __init__(self):
        from supabase import create_client
        self.client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_KEY")  # SERVICE key for dev.* access
        )
        self.backend = "supabase"
    
    def log_agent_activity(self, agent: str, action: str, input_data: dict = None, 
                           output_data: dict = None, tokens: int = 0, ms: int = 0):
        """Log agent activity to dev.agent_activity."""
        self.client.schema("dev").table("agent_activity").insert({
            "agent": agent,
            "action": action,
            "input": input_data,
            "output": output_data,
            "tokens": tokens,
            "ms": ms
        }).execute()
    
    def store_doc(self, kind: str, title: str, content: str, source: str = None, meta: dict = None):
        """Store a document in dev.docs."""
        self.client.schema("dev").table("docs").insert({
            "kind": kind,
            "title": title,
            "content": content,
            "source": source,
            "meta": meta or {}
        }).execute()
    
    def log_audit(self, severity: str, topic: str, message: str, details: dict = None):
        """Log audit finding to dev.audit_logs."""
        self.client.schema("dev").table("audit_logs").insert({
            "severity": severity,
            "topic": topic,
            "message": message,
            "details": details or {}
        }).execute()
    
    def get_docs(self, kind: str = None, limit: int = 10):
        """Retrieve documents from dev.docs."""
        query = self.client.schema("dev").table("docs").select("*")
        if kind:
            query = query.eq("kind", kind)
        return query.order("updated_at", desc=True).limit(limit).execute().data


# ==============================================================================
# Agent Definitions
# ==============================================================================

def create_agents(memory_store: MemoryStore) -> list[Agent]:
    """Create the agent team (3 agents + human review)."""
    
    architect = Agent(
        role='Symbol Architect',
        goal='Спроектировать логически чистую и символически непротиворечивую фичу',
        backstory='''Ты — хранитель символьной согласованности во вселенной SymbolField OS.
        Ты понимаешь глубинные связи между модулями и следишь за тем, 
        чтобы каждый новый элемент органично вписывался в существующую архитектуру.''',
        verbose=True,
        allow_delegation=False,
        llm=LLM
    )

    developer = Agent(
        role='MetaCoder',
        goal='Сгенерировать чистый, модульный код по спецификации',
        backstory='''Ты — проводник между замыслом и материализацией.
        Ты пишешь код, который не только работает, но и красив.
        Следуешь принципам DRY, SOLID и символьной чистоты.''',
        verbose=True,
        allow_delegation=False,
        llm=LLM
    )

    qa_guardian = Agent(
        role='QA Guardian',
        goal='Создать comprehensive тесты И провести code-review',
        backstory='''Ты — страж качества и стабильности.
        Находишь граничные случаи, пишешь тесты и проверяешь код на соответствие стандартам.
        Твоя задача — подготовить код для финального human review, выявив все потенциальные проблемы.''',
        verbose=True,
        allow_delegation=False,
        llm=LLM
    )

    return [architect, developer, qa_guardian]


# ==============================================================================
# Task Pipeline
# ==============================================================================

def create_tasks(agents: list[Agent], spec_content: str) -> list[Task]:
    """Create the task pipeline based on spec.md content and AGENT_MODE."""
    
    architect, developer, qa_guardian = agents
    mode = os.getenv("AGENT_MODE", "full").lower()
    
    # 1. Design Task
    task_design = Task(
        description=f'''Изучи следующую спецификацию и создай архитектурный план:

{spec_content}

Опиши:
1. Основные компоненты модуля
2. Интерфейсы и зависимости
3. Интеграцию с существующей архитектурой SF OS
''',
        agent=architect,
        expected_output='Markdown-документ с архитектурным планом модуля'
    )

    # 2. Implement Task
    task_implement = Task(
        description='''На основе архитектурного плана напиши реализацию модуля.
        
Требования:
- Чистый, модульный Python код
- Документация (docstrings)
- Type hints
- Следование стилю существующего SF OS кода
''',
        agent=developer,
        expected_output='Python файл(ы) с реализацией модуля',
        context=[task_design]
    )

    # 3. QA Task (Dynamic based on mode)
    if mode == "qa":
        # QA ONLY MODE: Context is the user-provided code (read from file) or just the spec
        # Ideally, we should pass the CODE CONTENT here.
        # For v1, we assume the code is already in the codebase and QA agent audits it via tools 
        # (or we pass the path).
        
        qa_description = f'''Проведи аудит кода, соответствующего спецификации:

{spec_content}

Ты работаешь в режиме "QA Only". Твоя задача:
1. Изучить существующий код (предполагается что он написан человеком или другим агентом).
2. Написать тесты и проверить качество.
3. Составить отчёт проблемы/рекомендации.

*Примечание: В текущей версии мы просто симулируем проверку, предполагая что агент видит код.*
'''
        # Remove dependency on previous tasks
        context = []
        
    else:
        # FULL PIPELINE
        qa_description = '''Проведи комплексную проверку реализованного модуля:

1. **Тестирование**:
   - Создай unit тесты для каждой функции (pytest)
   - Напиши edge-case тесты
   - Добавь integration тесты (если применимо)

2. **Code Review**:
   - Проверь соответствие архитектурному плану
   - Убедись в символьной согласованности с SF OS
   - Найди потенциальные баги и узкие места
   - Проверь документацию и type hints

3. **Итоговый отчёт**:
   - Список найденных проблем (если есть)
   - Рекомендации для human reviewer
   - Общая оценка готовности к merge
'''
        context = [task_design, task_implement]

    task_qa = Task(
        description=qa_description,
        agent=qa_guardian,
        expected_output='QA отчёт с рекомендациями и (опционально) тесты',
        context=context
    )

    if mode == "qa":
        print(f"🔧 Check mode: QA Only (skipping Architect/Developer)")
        return [task_qa]
    else:
        return [task_design, task_implement, task_qa]


# ==============================================================================
# Main Execution
# ==============================================================================

def main():
    """Run the agent pipeline."""
    import time
    
    print("🚀 SymbolField OS — Agent Pipeline Starting...")
    print("=" * 60)
    
    # Load spec
    spec_path = Path("spec.md")
    if not spec_path.exists():
        print("❌ Error: spec.md not found. Create it with your task description.")
        return
    
    spec_content = spec_path.read_text()
    print(f"📝 Loaded spec.md ({len(spec_content)} chars)")
    
    # Initialize memory
    memory = MemoryStore()
    print(f"🧠 Memory backend: {memory.backend}")
    
    # Store spec as dev.doc
    memory.store_doc(
        kind="spec",
        title=f"Task: {spec_path.stem}",
        content=spec_content,
        source=str(spec_path)
    )
    print("📄 Spec stored in dev.docs")
    
    # Create agents and tasks
    agents = create_agents(memory)
    tasks = create_tasks(agents, spec_content)
    
    print(f"👥 Agents: {[a.role for a in agents]}")
    print(f"📋 Tasks: {len(tasks)}")
    print("=" * 60)
    
    # Log pipeline start
    start_time = time.time()
    memory.log_agent_activity(
        agent="crew",
        action="pipeline_start",
        input_data={"spec": spec_content[:500], "agents": [a.role for a in agents]}
    )
    
    # Create and run crew
    crew = Crew(
        agents=agents,
        tasks=tasks,
        process=Process.sequential,
        verbose=True
    )
    
    result = crew.kickoff()
    elapsed_ms = int((time.time() - start_time) * 1000)
    
    # Save result locally
    output_path = Path("output/result.md")
    output_path.parent.mkdir(exist_ok=True)
    output_path.write_text(str(result))
    
    print("=" * 60)
    print(f"✅ Pipeline complete! Results saved to {output_path}")
    
    # Log pipeline completion
    memory.log_agent_activity(
        agent="crew",
        action="pipeline_complete",
        output_data={"result_preview": str(result)[:1000]},
        ms=elapsed_ms
    )
    
    # Store result as dev.doc
    memory.store_doc(
        kind="output",
        title=f"Result: {spec_path.stem}",
        content=str(result),
        source=str(output_path),
        meta={"elapsed_ms": elapsed_ms}
    )
    print("📊 Results logged to dev.*")


if __name__ == "__main__":
    main()

