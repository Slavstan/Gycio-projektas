const API_BASE_URL = "https://testapi.io/api/Slavstan/resource";
const TASKS_API_URL = `${API_BASE_URL}/tasklist`;
const AUTH_API_URL = `${API_BASE_URL}/auth`;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `API užklausa nepavyko (${response.status}).`);
  }

  if (response.status === 204) return null;

  const responseText = await response.text();
  return responseText ? JSON.parse(responseText) : null;
}

function getRecords(response) {
  const records = Array.isArray(response) ? response : response?.data;

  if (!Array.isArray(records)) {
    throw new Error("API grąžino netikėto formato duomenis.");
  }

  return records;
}

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title || "",
    status: task.status || "Nepradėta",
    deadline: task.deadline || "",
    username: task.username || "",
  };
}

export async function getTasks(username) {
  const response = await request(TASKS_API_URL);
  return getRecords(response)
    .filter((task) => task.username === username)
    .map(normalizeTask);
}

export async function createTask(task) {
  const response = await request(TASKS_API_URL, {
    method: "POST",
    body: JSON.stringify({
      title: task.title,
      status: task.status,
      deadline: task.deadline,
      username: task.username,
    }),
  });

  return normalizeTask(response?.data || response || task);
}

export async function updateTask(taskId, changes) {
  const response = await request(
    `${TASKS_API_URL}/${encodeURIComponent(taskId)}`,
    {
      method: "PUT",
      body: JSON.stringify(changes),
    },
  );

  return response?.data || response;
}

export async function authenticateUser(username, password) {
  const response = await request(AUTH_API_URL);
  const user = getRecords(response).find(
    (record) =>
      record.username?.toLowerCase() === username.trim().toLowerCase() &&
      record.password === password,
  );

  return user || null;
}

export async function registerUser(username, password) {
  const response = await request(AUTH_API_URL);
  const existingUser = getRecords(response).some(
    (record) =>
      record.username?.toLowerCase() === username.trim().toLowerCase(),
  );

  if (existingUser) {
    throw new Error("Toks vartotojo vardas jau naudojamas.");
  }

  const createdUser = await request(AUTH_API_URL, {
    method: "POST",
    body: JSON.stringify({ username: username.trim(), password }),
  });

  return createdUser?.data || createdUser || { username: username.trim() };
}
