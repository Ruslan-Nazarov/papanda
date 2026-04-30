
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), ".")))

try:
    from fastapi_app.services.dashboard_service import DashboardService
    print("DashboardService imported successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
