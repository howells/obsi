import React, {useState} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import Home from './views/home.js';
import Browse from './views/browse.js';
import Daily from './views/daily.js';
import Capture from './views/capture.js';
import Help from './views/help.js';

export type View = 'home' | 'browse' | 'daily' | 'capture' | 'help';

export default function App() {
  const {exit} = useApp();
  const [view, setView] = useState<View>('home');

  useInput((input, key) => {
    if (input === 'q' && view === 'home') {
      exit();
    }
    if (key.escape) {
      if (view === 'home') {
        exit();
      } else {
        setView('home');
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {view === 'home' && <Home onNavigate={setView} />}
      {view === 'browse' && <Browse onBack={() => setView('home')} />}
      {view === 'daily' && <Daily onBack={() => setView('home')} />}
      {view === 'capture' && <Capture onBack={() => setView('home')} />}
      {view === 'help' && <Help onBack={() => setView('home')} />}
    </Box>
  );
}
