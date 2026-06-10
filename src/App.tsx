import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import ChatbotPage from "./pages/chatbotPage";
import AdminPage from "./pages/adminPage";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<ChatbotPage />}
        />

        <Route
          path="/admin"
          element={<AdminPage />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;