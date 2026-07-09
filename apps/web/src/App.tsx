import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "./components/app-shell";
import { AskPage } from "./pages/ask-page";
import { LibraryPage } from "./pages/library-page";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/ask" replace />} />
        <Route path="ask" element={<AskPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="*" element={<Navigate to="/ask" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
