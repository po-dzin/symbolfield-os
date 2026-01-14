# SymbolField HUD - Development Principles

## Critical Rules (NEVER SKIP)

### 1. Git Workflow - MANDATORY
```bash
# ALWAYS create a feature branch before ANY experimental work
git checkout -b feature/descriptive-name

# NEVER work directly on main
# NEVER skip branch creation even for "small" changes
```

### 2. Incremental Development - ONE STEP AT A TIME
```
✅ Create ONE file -> git commit -> npm run dev -> browser test
✅ Modify ONE component -> git commit -> npm run dev -> browser test  
✅ Add ONE feature -> git commit -> npm run dev -> browser test

❌ NEVER modify multiple files without testing
❌ NEVER skip intermediate commits
❌ NEVER assume "it will work" without verification
```

### 3. Testing Protocol - MANDATORY AFTER EVERY CHANGE

**After EVERY code change:**
1. Wait for dev server hot reload (check terminal)
2. Open browser at http://localhost:5173
3. Verify UI loads without errors
4. Test the specific feature modified
5. Check browser console for errors

**Red flags requiring immediate rollback:**
- Empty DOM
- White screen
- Console errors
- Failed imports

### 4. Dev Server Health

```bash
# Restart dev server if:
- Strange errors appear
- HMR stops working
- Dev server runs > 12 hours
- After major refactoring

# Command:
pkill -f "vite" && npm run dev
```

### 5. Error Recovery Protocol

**If something breaks:**
```bash
1. DON'T panic-edit multiple files
2. Check browser console for EXACT error
3. Check dev server terminal for EXACT error
4. Fix ONE thing at a time
5. Test after each fix

# Nuclear option (last resort):
git status              # See what changed
git diff               # Review changes
git reset --hard HEAD  # Revert everything
```

### 6. Complex Features - Use Implementation Plans

**Before implementing ANY complex feature:**
1. Create `implementation_plan.md` artifact
2. Break down into atomic steps
3. Get user approval
4. Implement step-by-step
5. Test after each step

### 7. File Organization

```
New features should:
- Have clear module boundaries
- Be in logical directories (e.g., /engine/ for Harmony Engine)
- Have minimal cross-dependencies
- Be tested in isolation first
```

## Specific to SymbolField OS

### UI Component Changes
- Always test in BOTH modes: NOW view and Graph view
- Test with different tones (Deep, Flow, Luma)
- Verify responsive behavior

### Store Modifications
- Never modify multiple stores simultaneously
- Test state updates in isolation
- Verify subscriptions work correctly

### Visual Changes
- Test in both light mode (LUMA) and dark mode (DEEP/FLOW)
- Verify CSS animations work
- Check for performance issues

## Commit Message Format

```
feat: Brief description of feature
fix: Brief description of bug fix
refactor: Brief description of refactoring
test: Add tests for X
docs: Update documentation
```

## Recovery Procedures

### If Dev Server is Broken
1. Kill all node processes: `pkill -f node`
2. Clear node_modules cache: `npm cache clean --force`
3. Reinstall: `rm -rf node_modules && npm install`
4. Restart: `npm run dev`

### If Git State is Messy
```bash
git stash              # Save current work
git status             # Verify clean
git stash pop          # Restore work
# OR
git reset --hard HEAD  # Nuclear option
```

## User Communication

- **Ask before** major architectural changes
- **Report progress** after each milestone
- **Request clarification** if requirements are ambiguous
- **Admit mistakes** immediately and propose fixes

---

**Last Updated:** 2025-11-29
**Violations:** Document any violations here with date and lesson learned
