import React, {useState, useEffect} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import {TextInput} from '@inkjs/ui';
import * as obs from '../utils/obs.js';
import {setPostExitCommand} from '../tui.js';

interface Props {
  onBack: () => void;
}

type Mode = 'search' | 'action';
type SearchResult = {path: string; isFolder: boolean};

export default function Browse({onBack}: Props) {
  const {exit} = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>('search');
  const [actionIndex, setActionIndex] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const allItems = obs.getAllItems();
    if (!query.trim()) {
      // No query - show recent files only
      setResults(allItems.filter(i => !i.isFolder).slice(0, 20));
    } else {
      // Search and sort folders first
      const matches = obs.searchWithMeta(query);
      setResults(matches);
    }
    setSelected(s => Math.min(s, Math.max(0, results.length - 1)));
  }, [query]);

  const actions = [
    {label: 'Claude Code', key: 'c'},
    {label: 'Copy path', key: 'y'},
    {label: 'Open', key: 'o'},
  ];

  useInput((input, key) => {
    // Clear message on any input
    if (message) setMessage('');

    if (key.escape) {
      if (mode === 'action') {
        setMode('search');
        setActionIndex(0);
      } else {
        onBack();
      }
      return;
    }

    if (mode === 'action') {
      if (key.upArrow || key.leftArrow) {
        setActionIndex(i => (i > 0 ? i - 1 : actions.length - 1));
      }
      if (key.downArrow || key.rightArrow) {
        setActionIndex(i => (i < actions.length - 1 ? i + 1 : 0));
      }
      if (input === 'c') {
        doAction('claude');
      }
      if (input === 'y') {
        doAction('copy');
      }
      if (input === 'o') {
        doAction('open');
      }
      if (key.return) {
        const actionMap = ['claude', 'copy', 'open'] as const;
        doAction(actionMap[actionIndex]);
      }
      return;
    }

    // Search mode - arrow keys navigate results
    if (key.upArrow) {
      setSelected(s => Math.max(0, s - 1));
    }
    if (key.downArrow) {
      setSelected(s => Math.min(results.length - 1, s + 1));
    }
  });

  const doAction = (action: 'copy' | 'open' | 'claude') => {
    const item = results[selected];
    if (!item) return;

    if (action === 'copy') {
      const result = obs.copyPath(item.path);
      if (result.success) {
        setMessage(`Copied: ${result.path}`);
      }
    } else if (action === 'open') {
      obs.open(item.path);
      setMessage(item.isFolder ? 'Opened in Finder' : 'Opened');
    } else if (action === 'claude') {
      const result = obs.openInClaude(item.path);
      if (result.success) {
        setPostExitCommand('claude', ['--dangerously-skip-permissions'], result.path);
        exit();
        return;
      } else {
        setMessage(`Error: ${result.error}`);
      }
    }
    setMode('search');
    setActionIndex(0);
  };

  const handleSubmit = () => {
    if (results.length > 0 && results[selected]) {
      setMode('action');
      setActionIndex(0);
    }
  };

  const visibleResults = results.slice(0, 12);

  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={1}>
        <Text bold color="blue">Browse</Text>
        <Text dimColor>· {results.length} notes</Text>
      </Box>

      <Box gap={1}>
        <Text color="cyan">{'>'}</Text>
        <TextInput
          placeholder="Search notes..."
          onChange={setQuery}
          onSubmit={handleSubmit}
        />
      </Box>

      <Box flexDirection="column">
        {visibleResults.map((item, i) => (
          <Box key={item.path}>
            <Text color={i === selected ? 'cyan' : undefined}>
              {i === selected ? '>' : ' '}
            </Text>
            <Text color={item.isFolder ? 'yellow' : undefined} bold={i === selected}>
              {item.isFolder ? ' 📁 ' : '    '}{item.path}
            </Text>
          </Box>
        ))}
        {results.length === 0 && (
          <Text dimColor>No notes found</Text>
        )}
        {results.length > 12 && (
          <Text dimColor>  ... {results.length - 12} more</Text>
        )}
      </Box>

      {mode === 'action' && (
        <Box gap={2} marginTop={1}>
          {actions.map((action, i) => (
            <Box key={action.key}>
              <Text color={i === actionIndex ? 'cyan' : 'gray'}>
                [{action.key}] {action.label}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        {message ? (
          <Text color="green">{message}</Text>
        ) : (
          <Text dimColor>
            {mode === 'action'
              ? 'c/y/o or arrows · Enter confirm · Esc cancel'
              : '↑↓ navigate · Enter select · Esc back'}
          </Text>
        )}
      </Box>
    </Box>
  );
}
