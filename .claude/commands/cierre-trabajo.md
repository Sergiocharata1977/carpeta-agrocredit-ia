# Skill: /cierre-trabajo

Cierra el trabajo en curso: verifica TypeScript, hace commit de todos los cambios y pushea al remoto.

## Trigger
Ejecutar cuando el usuario escriba "cierre de trabajo", "cierre trabajo", o invoque `/cierre-trabajo`.

## Pasos

1. **TypeScript check** — verificar que no hay errores de tipos
   ```bash
   npx tsc --noEmit
   ```
   Si hay errores: reportarlos y **NO** continuar con el commit.

2. **Git status** — ver qué cambios hay
   ```bash
   git status
   git diff --stat
   ```

3. **Commit** — agregar archivos modificados y crear commit
   ```bash
   git add -A
   git commit -m "$(cat <<'EOF'
   feat: [resumen de cambios de la sesión]

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```
   El mensaje del commit debe resumir los cambios reales de la sesión actual.

4. **Push**
   ```bash
   git push
   ```

5. **Confirmar** — reportar al usuario:
   - Rama pusheada
   - Hash del commit
   - Archivos incluidos (listado breve)

## Reglas
- Si `npx tsc --noEmit` falla → reportar errores, NO hacer commit, pedir confirmación explícita
- Si `git push` falla → reportar el error sin reintentar
- Nunca usar `--force` ni `--no-verify`
- No crear PRs — solo commit + push a la rama actual
