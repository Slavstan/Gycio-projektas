import { useEffect, useState } from "react";
import TaskList from "./TaskList";
import ProgressBar from "./ProgressBar";
import Navbar from "./Navbar";
import AddTaskForm from "./AddTaskForm";
import Profile from "./Profile";
import {
  authenticateUser,
  createTask,
  getTasks,
  registerUser,
  updateTask,
} from "./taskApi";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("home");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState("");

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !user?.username) return undefined;

    let isCurrent = true;
    setTasksLoading(true);
    setApiError("");

    getTasks(user.username)
      .then((loadedTasks) => {
        if (isCurrent) setTasks(loadedTasks);
      })
      .catch(() => {
        if (isCurrent) {
          setApiError("Nepavyko įkelti užduočių iš API. Bandykite dar kartą.");
        }
      })
      .finally(() => {
        if (isCurrent) setTasksLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isLoggedIn, user?.username]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsAuthenticating(true);
    setLoginError("");

    try {
      if (isRegistering) {
        const registeredUser = await registerUser(username, password);
        setUser({ username: registeredUser.username || username.trim() });
      } else {
        const authenticatedUser = await authenticateUser(username, password);

        if (!authenticatedUser) {
          setLoginError("Neteisingas vartotojo vardas arba slaptažodis.");
          return;
        }

        setUser({ username: authenticatedUser.username });
      }

      setIsLoggedIn(true);
      setPassword("");
    } catch (error) {
      setLoginError(
        error.message || "Nepavyko susisiekti su prisijungimo API.",
      );
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setUser(null);
    setUsername("");
    setPassword("");
    setTasks([]);
    setTasksLoading(true);
    setApiError("");
    setLoginError("");
    setIsRegistering(false);
    setActivePage("home");
  }

  async function handleAddTask(newTask) {
    try {
      setApiError("");
      const createdTask = await createTask({
        ...newTask,
        username: user.username,
      });
      setTasks((currentTasks) => [...currentTasks, createdTask]);
      return true;
    } catch {
      setApiError("Nepavyko išsaugoti užduoties. Bandykite dar kartą.");
      return false;
    }
  }

  async function handleTaskChange(taskId, changes) {
    try {
      setApiError("");
      const currentTask = tasks.find(
        (task) => String(task.id) === String(taskId),
      );

      if (!currentTask) return;

      await updateTask(taskId, {
        title: currentTask.title,
        status: currentTask.status,
        deadline: currentTask.deadline,
        username: currentTask.username,
        ...changes,
      });
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          String(task.id) === String(taskId) ? { ...task, ...changes } : task,
        ),
      );
    } catch {
      setApiError("Nepavyko atnaujinti užduoties. Bandykite dar kartą.");
    }
  }

  function handleTaskStatusChange(taskId, status) {
    handleTaskChange(taskId, { status });
  }

  function handleTaskDeadlineChange(taskId, deadline) {
    handleTaskChange(taskId, { deadline });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedTaskCount = tasks.filter(
    (task) => task.status === "Atlikta",
  ).length;
  const overdueTaskCount = tasks.filter((task) => {
    if (task.status === "Atlikta" || !task.deadline) return false;

    const deadline = new Date(`${task.deadline}T00:00:00`);
    return deadline < today;
  }).length;

  return (
    <>
      <Navbar activePage={activePage} onNavigate={setActivePage} />

      {activePage === "home" && (
        <>
          {isLoggedIn && (
            <header className="welcome-message">
              <h1>Sveiki sugrįžę!</h1>
              <p>Prisijungėte kaip {user?.username}.</p>
              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
              >
                Atsijungti
              </button>
            </header>
          )}

          <main className="login-page">
            {!isLoggedIn && (
              <div className="login-card">
                <>
                  <header className="login-card__header">
                    <h1>Prisijungti</h1>
                    <p>
                      {isRegistering
                        ? "Sukurkite paskyrą, kad pradėtumėte"
                        : "Įveskite savo duomenis, kad tęstumėte"}
                    </p>
                  </header>

                  <form className="login-form" onSubmit={handleSubmit}>
                    <label className="login-field">
                      <span>Vartotojo vardas</span>
                      <input
                        type="text"
                        name="username"
                        autoComplete="username"
                        placeholder="admin"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        required
                      />
                    </label>

                    <label className="login-field">
                      <span>Slaptažodis</span>
                      <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                    </label>

                    <button
                      type="submit"
                      className="login-submit"
                      disabled={isAuthenticating}
                    >
                      {isAuthenticating
                        ? "Prašome palaukti..."
                        : isRegistering
                          ? "Sukurti paskyrą"
                          : "Prisijungti"}
                    </button>

                    <button
                      type="button"
                      className="auth-mode-toggle"
                      onClick={() => {
                        setIsRegistering((currentValue) => !currentValue);
                        setLoginError("");
                      }}
                    >
                      {isRegistering
                        ? "Jau turite paskyrą? Prisijunkite"
                        : "Neturite paskyros? Sukurkite ją"}
                    </button>

                    {loginError && (
                      <p className="login-error" role="alert">
                        {loginError}
                      </p>
                    )}
                  </form>
                </>
              </div>
            )}

            {isLoggedIn && (
              <>
                <section className="dashboard-summary" aria-label="Užduočių suvestinė">
                  <p>
                    <strong>{tasks.length} užduotys</strong>
                    <span aria-hidden="true">·</span>
                    <strong>{completedTaskCount} atliktos</strong>
                    <span aria-hidden="true">·</span>
                    <strong>{overdueTaskCount} vėluoja</strong>
                  </p>
                </section>

                {apiError && (
                  <p className="login-error" role="alert">
                    {apiError}
                  </p>
                )}

                <TaskList
                  tasks={tasks}
                  loading={tasksLoading}
                  onStatusChange={handleTaskStatusChange}
                  onDeadlineChange={handleTaskDeadlineChange}
                />

                <AddTaskForm onAddTask={handleAddTask} />

                <ProgressBar initialProgress={50} />
              </>
            )}
          </main>
        </>
      )}

      {activePage === "profile" && user && (
        <Profile user={user} tasks={tasks} />
      )}
    </>
  );
}

export default App;
