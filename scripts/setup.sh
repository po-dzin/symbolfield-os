#!/bin/bash
# ==============================================================================
# 🚀 SymbolField OS — Agent Environment Setup
# ==============================================================================
# Выполняется один раз на машине для настройки среды разработки

set -e  # Exit on error

echo "🔧 Installing Python environment manager (uv)..."
brew install uv

echo "🐍 Creating Python virtual environment..."
uv venv .venv
source .venv/bin/activate

echo "📦 Installing Python dependencies..."
uv pip install \
    crewai \
    crewai-tools \
    openai \
    anthropic \
    python-dotenv \
    chromadb \
    supabase

echo "📁 Creating project structure..."
mkdir -p agents tools memory

echo "📝 Creating .env template..."
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Memory Backend: "chroma" or "supabase"
MEMORY_BACKEND=chroma

# Supabase (if using supabase backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
EOF
    echo "✅ Created .env template — fill in your API keys!"
else
    echo "⏭️  .env already exists, skipping..."
fi

echo "📝 Creating spec.md template..."
if [ ! -f spec.md ]; then
    cat > spec.md << 'EOF'
# Task Specification

## Objective
[Describe what you want the agents to build]

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Constraints
- Must integrate with existing SF OS architecture
- Must maintain symbolic consistency
EOF
    echo "✅ Created spec.md template"
else
    echo "⏭️  spec.md already exists, skipping..."
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Fill in .env with your API keys"
echo "  2. Edit spec.md with your task"
echo "  3. Run: python main.py"
echo "══════════════════════════════════════════════════════════════"
