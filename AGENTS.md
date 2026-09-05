# Kollo Architecture Rules

## 1. File Size Limit
- **Strict Limit:** No file in the project may exceed **200 lines**.
- When a file approaches 200 lines, it must be modularized into a dedicated subfolder or smaller single-responsibility files.

## 2. Single Responsibility Principle (SRP)
- Every file must have a single, well-defined purpose (e.g. date formatting, modal dialogs, transaction tools, etc.).
- Avoid combining disparate domains or concerns into monolithic files.

## 3. Simplicity & Scalability
- Vanilla ES6 JavaScript: clean, readable, without unnecessary dependencies or bundler magic.
- Predictable and modular directory structure.

## 4. Core Integrity
- Preserve existing global contracts (`Bus`, `R`, `UI`, `AI`, `VIEWS`, `Hist`, `DB`, `S`).
- Maintain full backward compatibility and passing internal tests.
