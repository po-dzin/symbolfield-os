#!/bin/zsh
# Postinstall script to fix typos in @blocksuite packages
# This fixes the CheckBoxCkeckSolidIcon → CheckBoxCheckSolidIcon typo in upstream packages

echo "🔧 Fixing @blocksuite icon typos..."
find node_modules/@blocksuite -name "*.js" -type f -exec sed -i '' 's/CheckBoxCkeckSolidIcon/CheckBoxCheckSolidIcon/g' {} \; 2>/dev/null
echo "✅ @blocksuite fixes applied"
