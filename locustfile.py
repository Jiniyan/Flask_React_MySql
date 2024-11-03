from locust import HttpUser, TaskSet, task, between

class UserBehavior(TaskSet):
    logged_in = False  # Flag to track login status

    def on_start(self):
        """Called when a simulated user starts executing the script. Checks if login is necessary."""
        self.ensure_logged_in()

    def ensure_logged_in(self):
        """Check if user is logged in by accessing a protected page and log in if needed."""
        with self.client.get("/dashboard", name="check_login_status", catch_response=True) as response:
            # If access is unauthorized, perform login
            if response.status_code in [401, 403]:
                response.failure("User not authenticated; logging in.")
                self.login()
            else:
                response.success()
                self.logged_in = True  # Mark as logged in
                print("Already logged in or access granted.")

    def login(self):
        """Log in to the application with credentials."""
        # Step 1: Open the login page to retrieve any necessary cookies or tokens
        self.client.get("/login")
        
        # Step 2: Submit credentials to log in
        response = self.client.post("/login", data={
            "username": "user1",
            "password": "passwordd"
        })
        
        if response.status_code == 200:
            print("Login successful")
            self.logged_in = True  # Mark as logged in to avoid redundant logins
        else:
            print("Login failed:", response.text)

    @task(1)
    def home_page(self):
        """Access the home page without credentials."""
        self.client.get("/")

    @task(1)
    def login_page(self):
        """Access the login page only if not logged in."""
        if not self.logged_in:
            self.client.get("/login")

    @task(2)
    def dashboard_page(self):
        """Access the dashboard page, which requires authentication."""
        if self.logged_in:
            self.client.get("/dashboard")

    @task(1)
    def settings_page(self):
        """Access the settings page, which requires authentication."""
        if self.logged_in:
            self.client.get("/settings")

    @task(1)
    def reports_page(self):
        """Access the reports page, which requires authentication."""
        if self.logged_in:
            self.client.get("/reports")


class WebsiteUser(HttpUser):
    tasks = [UserBehavior]
    wait_time = between(3, 5)
