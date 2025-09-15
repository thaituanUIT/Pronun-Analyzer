@echo off
echo GPU/CPU Docker Launcher
echo ==========================

:: Check for GPU support
nvidia-smi >nul 2>&1
if %errorlevel% equ 0 (
    echo NVIDIA GPU detected
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
    echo.
    
    echo Choose deployment mode:
    echo 1 GPU mode (recommended for faster processing)
    echo 2 CPU mode (fallback/compatibility)
    set /p choice="Enter choice (1 or 2): "
    
    if "%choice%"=="1" (
        echo Starting with GPU acceleration...
        
        :: Test GPU Docker support
        docker run --rm --gpus all nvidia/cuda:11.8-runtime-ubuntu22.04 nvidia-smi >nul 2>&1
        if %errorlevel% equ 0 (
            echo Docker GPU support confirmed
            docker-compose down -v
            docker-compose up --build
        ) else (
            echo Docker GPU support not available
            echo Please install nvidia-docker2 or use CPU mode
            echo Installation guide: see GPU_SETUP.md
            pause
            exit /b 1
        )
    ) else (
        echo Starting with CPU mode...
        docker-compose -f docker-compose.cpu.yml down -v
        docker-compose -f docker-compose.cpu.yml up --build
    )
) else (
    echo No NVIDIA GPU detected, using CPU mode...
    docker-compose -f docker-compose.cpu.yml down -v
    docker-compose -f docker-compose.cpu.yml up --build
)
