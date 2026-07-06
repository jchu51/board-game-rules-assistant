import { Routes, Route } from "react-router";
import { UploadPage } from "./pages/upload-page";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
    </Routes>
  );
}

export default App;
