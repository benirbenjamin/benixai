import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/AudioRecorder.css';

function App() {
  return (
    <div className="App">
      // ...existing code...
      <ToastContainer position="top-right" />
    </div>
  );
}

export default App;