#!/bin/bash
sed -i 's/<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white text-lg">\$<\/span>/<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white text-lg">₹<\/span>/g' client/src/components/DebtForm.tsx
