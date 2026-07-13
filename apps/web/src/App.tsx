import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "./components/app-shell";
import { ChatPage } from "./pages/chat-page";
import { LibraryPage } from "./pages/library-page";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="ask" element={<Navigate to="/chat" replace />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
