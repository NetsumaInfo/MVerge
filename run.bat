@echo off
setlocal EnableExtensions EnableDelayedExpansion

if /i not "%~1"=="--keep-open-session" (
  echo %CMDCMDLINE% | findstr /i /c:" /c " >nul
  if not errorlevel 1 (
    cmd /k ""%~f0" --keep-open-session %*"
    exit /b
  )
)

set "ROOT=%~dp0"
set "SCRIPT_PATH=%~f0"
set "AGENTS_MD=%ROOT%AGENTS.md"
set "FRONTEND=%ROOT%frontend"
set "BACKEND=%ROOT%backend"
set "VENV_PY=%BACKEND%\venv\Scripts\python.exe"
set "SIDECAR_EXE=%FRONTEND%\src-tauri\bin\backend_script-x86_64-pc-windows-msvc\backend_script.exe"
set "RUN_STAMP_FILE=%ROOT%.mverge-run-stamp"
set "BRANCH_SWITCHED=0"
set "LAUNCHER_VERSION=2.2-auto-stash"
set "SKIP_APP_LAUNCH=0"
set "SWITCH_ONLY=0"
set "PAUSE_ON_FINISH=1"

:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--keep-open-session" (
  shift
  goto :parse_args
)
if /i "%~1"=="--no-launch" set "SKIP_APP_LAUNCH=1"
if /i "%~1"=="--switch-only" (
  set "SWITCH_ONLY=1"
  set "SKIP_APP_LAUNCH=1"
)
if /i "%~1"=="--no-pause" set "PAUSE_ON_FINISH=0"
shift
goto :parse_args
:args_done

cd /d "%ROOT%"
if errorlevel 1 (
  echo [ERROR] Unable to access project root.
  goto :fail
)

call :ensure_agents_md
if errorlevel 1 (
  echo [ERROR] Failed to initialize AGENTS.md.
  goto :fail
)

echo [INFO] MVerge launcher v!LAUNCHER_VERSION!
echo [INFO] Script: !SCRIPT_PATH!

if exist ".git" (
  where git >nul 2>&1
  if errorlevel 1 (
    echo [WARN] git not found, cannot choose a branch. Continuing on current branch.
  ) else (
    echo [INFO] Syncing git refs...
    git fetch --all --prune >nul 2>&1
    if errorlevel 1 (
      echo [WARN] git fetch failed. Continuing with local refs.
    )

    set "CURRENT_BRANCH="
    for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "CURRENT_BRANCH=%%B"

    if not defined CURRENT_BRANCH (
      echo [WARN] Could not detect current branch. Continuing without branch switch.
    ) else (
      set "TARGET_BRANCH="
      set /a BRANCH_COUNT=0

      echo.
      echo [INFO] Current branch: !CURRENT_BRANCH!
      echo [INFO] Detected local branches:

      for /f "delims=" %%B in ('git for-each-ref --format^="%%(refname:short)" refs/heads') do (
        set /a BRANCH_COUNT+=1
        set "BRANCH_!BRANCH_COUNT!=%%B"
        if /i "%%B"=="!CURRENT_BRANCH!" (
          echo   [!BRANCH_COUNT!] %%B ^(current^)
        ) else (
          echo   [!BRANCH_COUNT!] %%B
        )
      )

      if !BRANCH_COUNT! LEQ 0 (
        echo [WARN] No local branch detected. Continuing on current branch.
        set "TARGET_BRANCH=!CURRENT_BRANCH!"
      ) else (
        echo   [0] Enter another branch ^(e.g. origin/my-branch^)
        echo.
        set /p "BRANCH_CHOICE=Your choice ^(0-!BRANCH_COUNT!^): "
        call :trim_branch_choice

        if not defined BRANCH_CHOICE (
          echo [WARN] No choice entered. Staying on current branch.
          set "TARGET_BRANCH=!CURRENT_BRANCH!"
        ) else (
          set "IS_NUMERIC=1"
          for /f "delims=0123456789" %%N in ("!BRANCH_CHOICE!") do set "IS_NUMERIC=0"

          if "!IS_NUMERIC!"=="1" (
            if !BRANCH_CHOICE! GEQ 1 if !BRANCH_CHOICE! LEQ !BRANCH_COUNT! (
              call set "TARGET_BRANCH=%%BRANCH_!BRANCH_CHOICE!%%"
            )

            if "!BRANCH_CHOICE!"=="0" (
              set /p "TARGET_BRANCH=Branch name: "
              call :trim_target_branch
            )
          ) else (
            set "TARGET_BRANCH=!BRANCH_CHOICE!"
          )
        )
      )

      call :trim_target_branch

      if not defined TARGET_BRANCH (
        echo [ERROR] No branch name entered.
        goto :fail
      )

      if /i "!TARGET_BRANCH:~0,7!"=="origin/" (
        set "TARGET_BRANCH=!TARGET_BRANCH:~7!"
      )

      if /i not "!TARGET_BRANCH!"=="!CURRENT_BRANCH!" (
        set "CHECKOUT_MODE=local"
        git show-ref --verify --quiet "refs/heads/!TARGET_BRANCH!"
        if errorlevel 1 (
          git show-ref --verify --quiet "refs/remotes/origin/!TARGET_BRANCH!"
          if errorlevel 1 (
            echo [ERROR] Branch "!TARGET_BRANCH!" does not exist locally or on origin.
            goto :fail
          )
          set "CHECKOUT_MODE=remote"
        )

        call :checkout_target_branch "!TARGET_BRANCH!" "!CHECKOUT_MODE!" "!CURRENT_BRANCH!"
        if errorlevel 10 (
          goto :fail
        )
        if errorlevel 1 (
          set "TARGET_BRANCH=!CURRENT_BRANCH!"
        ) else (
          set "BRANCH_SWITCHED=1"
        )
      )
    )
  )
)

if "!SWITCH_ONLY!"=="1" (
  for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "RUN_BRANCH=%%B"
  echo [INFO] switch-only mode: active branch "!RUN_BRANCH!".
  goto :success
)

if "!SKIP_APP_LAUNCH!"=="0" (
  echo.
  set "LAUNCH_CHOICE=Y"
  set /p "LAUNCH_CHOICE=Launch application now? ^(Y/n^): "
  call :trim_launch_choice
  if /i "!LAUNCH_CHOICE!"=="n" set "SKIP_APP_LAUNCH=1"
)

if "!SKIP_APP_LAUNCH!"=="1" (
  for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "RUN_BRANCH=%%B"
  echo [INFO] no-launch mode: active branch "!RUN_BRANCH!".
  goto :success
)

set "RUN_BRANCH=current"
set "RUN_HEAD=nogit"
set "RUN_MARK=current|nogit"
set "REFRESH_DEPS=0"

if exist ".git" (
  where git >nul 2>&1
  if not errorlevel 1 (
    for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "RUN_BRANCH=%%B"
    for /f "delims=" %%H in ('git rev-parse --short HEAD 2^>nul') do set "RUN_HEAD=%%H"
    set "RUN_MARK=!RUN_BRANCH!|!RUN_HEAD!"
  )
)

if "!BRANCH_SWITCHED!"=="1" (
  set "REFRESH_DEPS=1"
)

if exist "!RUN_STAMP_FILE!" (
  set "LAST_RUN_MARK="
  set /p LAST_RUN_MARK=<"!RUN_STAMP_FILE!"
  if /i not "!LAST_RUN_MARK!"=="!RUN_MARK!" (
    set "REFRESH_DEPS=1"
  )
) else (
  set "REFRESH_DEPS=1"
)

cd /d "%FRONTEND%"
if errorlevel 1 (
  echo [ERROR] Unable to access frontend directory.
  goto :fail
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js and try again.
  goto :fail
)

if "!REFRESH_DEPS!"=="1" (
  echo [INFO] Branch/commit change detected ^(!RUN_MARK!^).
  echo [INFO] Checking npm dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    goto :fail
  )
)

if not exist "node_modules" (
  if not "!REFRESH_DEPS!"=="1" (
    echo [INFO] Installing npm dependencies...
    call npm install
    if errorlevel 1 (
      echo [ERROR] npm install failed.
      goto :fail
    )
  )
)

set "REBUILD_SIDECAR=0"
if "!REFRESH_DEPS!"=="1" set "REBUILD_SIDECAR=1"
if not exist "%SIDECAR_EXE%" set "REBUILD_SIDECAR=1"

if "!REBUILD_SIDECAR!"=="1" (
  echo [INFO] Preparing backend sidecar for active branch...
  if exist "%SIDECAR_EXE%" (
    echo [INFO] Rebuilding backend sidecar for active branch...
  )

  if not exist "%VENV_PY%" (
    where py >nul 2>&1
    if not errorlevel 1 (
      echo [INFO] Creating backend venv with py -3...
      py -3 -m venv "%BACKEND%\venv"
    ) else (
      where python >nul 2>&1
      if errorlevel 1 (
        echo [ERROR] Python not found. Install Python 3 and retry.
        goto :fail
      )
      echo [INFO] Creating backend venv with python...
      python -m venv "%BACKEND%\venv"
    )

    if errorlevel 1 (
      echo [ERROR] Backend venv creation failed.
      goto :fail
    )
  )

  echo [INFO] Installing backend dependencies...
  call "%VENV_PY%" -m pip install --upgrade pip
  if errorlevel 1 (
    echo [ERROR] pip upgrade failed.
    goto :fail
  )

  call "%VENV_PY%" -m pip install -r "%BACKEND%\requirements.txt"
  if errorlevel 1 (
    echo [ERROR] Backend dependency installation failed.
    goto :fail
  )

  echo [INFO] Installing PyInstaller...
  call "%VENV_PY%" -m pip install pyinstaller
  if errorlevel 1 (
    echo [ERROR] PyInstaller installation failed.
    goto :fail
  )

  echo [INFO] Building backend sidecar...
  call npm run build:sidecar
  if errorlevel 1 (
    echo [ERROR] Sidecar build failed.
    goto :fail
  )
)

echo !RUN_MARK!> "!RUN_STAMP_FILE!"

if "!SKIP_APP_LAUNCH!"=="1" (
  echo [INFO] --no-launch option enabled. Exiting without launching app.
  goto :finish
)

echo [INFO] Launching Tauri application (dev mode)...
call npm run tauri dev
set "TAURI_EXIT_CODE=%ERRORLEVEL%"
if errorlevel 1 (
  echo [ERROR] Application launch failed.
  echo [INFO] Exit code: !TAURI_EXIT_CODE!
  goto :fail
)
echo [INFO] Application finished. Exit code: !TAURI_EXIT_CODE!

:finish
if "!PAUSE_ON_FINISH!"=="1" (
  echo.
  echo Press any key to close...
  pause >nul
)

:success
endlocal
exit /b 0

:trim_branch_choice
if not defined BRANCH_CHOICE exit /b 0
for /f "tokens=* delims= " %%A in ("!BRANCH_CHOICE!") do set "BRANCH_CHOICE=%%A"
:trim_branch_choice_right_loop
if defined BRANCH_CHOICE if "!BRANCH_CHOICE:~-1!"==" " (
  set "BRANCH_CHOICE=!BRANCH_CHOICE:~0,-1!"
  goto :trim_branch_choice_right_loop
)
exit /b 0

:trim_target_branch
if not defined TARGET_BRANCH exit /b 0
for /f "tokens=* delims= " %%A in ("!TARGET_BRANCH!") do set "TARGET_BRANCH=%%A"
:trim_target_branch_right_loop
if defined TARGET_BRANCH if "!TARGET_BRANCH:~-1!"==" " (
  set "TARGET_BRANCH=!TARGET_BRANCH:~0,-1!"
  goto :trim_target_branch_right_loop
)
exit /b 0

:trim_launch_choice
if not defined LAUNCH_CHOICE exit /b 0
for /f "tokens=* delims= " %%A in ("!LAUNCH_CHOICE!") do set "LAUNCH_CHOICE=%%A"
:trim_launch_choice_right_loop
if defined LAUNCH_CHOICE if "!LAUNCH_CHOICE:~-1!"==" " (
  set "LAUNCH_CHOICE=!LAUNCH_CHOICE:~0,-1!"
  goto :trim_launch_choice_right_loop
)
exit /b 0

:checkout_target_branch
set "CTB_TARGET=%~1"
set "CTB_MODE=%~2"
set "CTB_CURRENT=%~3"

if /i "!CTB_MODE!"=="remote" (
  echo [INFO] Creating local branch "!CTB_TARGET!" from origin/!CTB_TARGET!...
  git checkout -b "!CTB_TARGET!" "origin/!CTB_TARGET!"
) else (
  echo [INFO] Checking out branch "!CTB_TARGET!"...
  git checkout "!CTB_TARGET!"
)

if not errorlevel 1 (
  exit /b 0
)

echo [WARN] Checkout blocked by uncommitted local changes.
echo [INFO] Auto-stashing local changes and retrying...

set "AUTO_STASH_LABEL=mverge/run.bat auto-stash %DATE% %TIME%"
echo [INFO] Stashing local changes...
git stash push --include-untracked -m "!AUTO_STASH_LABEL!"
if errorlevel 1 (
  echo [ERROR] Failed to stash local changes.
  echo [INFO] You can stash manually, then rerun:
  echo [INFO]   git stash push --include-untracked -m "manual stash before run"
  exit /b 10
)

if /i "!CTB_MODE!"=="remote" (
  git checkout -b "!CTB_TARGET!" "origin/!CTB_TARGET!"
) else (
  git checkout "!CTB_TARGET!"
)

if errorlevel 1 (
  echo [ERROR] Checkout failed even after stash.
  echo [INFO] Your changes are in the latest stash: git stash list
  exit /b 10
)

echo [INFO] Checkout succeeded after stash.
echo [INFO] To restore your changes later: git stash pop
exit /b 0

:ensure_agents_md
if exist "!AGENTS_MD!" (
  echo [INFO] AGENTS.md found. No overwrite.
  exit /b 0
)

goto :write_agents_md
exit /b 0

:write_agents_md
echo [INFO] AGENTS.md missing. Creating file...
(
  echo # Agent Runtime Policy
  echo.
  echo ## HARD REQUIREMENT
  echo.
  echo All agents MUST use the `caveman` skill for every task.
  echo.
  echo ## Mandatory Rules
  echo.
  echo - Always load and use the `caveman` skill for all tasks without exception.
  echo - If the skill is unavailable, stop immediately and report the issue clearly before continuing.
  echo.
  echo ## Compliance
  echo.
  echo - All contributions and behavior must follow [CONTRIBUTING.md](CONTRIBUTING.md^).
  echo - All interactions must follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md^).
) > "!AGENTS_MD!"
if errorlevel 1 (
  echo [ERROR] Failed to write AGENTS.md.
  exit /b 1
)
exit /b 0

:fail
echo.
echo Press any key to close...
pause >nul
endlocal
exit /b 1
