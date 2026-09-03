/** CSS injected into the @pierre/diffs Shadow DOM for application theme integration. */
export const PIERRE_DIFFS_THEME_CSS = `
  [data-separator-wrapper] {
    color: hsl(var(--muted-foreground));
  }
  [data-expand-button] {
    width: 54px !important;
    height: 32px !important;
    border-radius: 4px;
    opacity: 0.5;
    transition: opacity 0.15s, background-color 0.15s;
  }
  [data-separator-wrapper][data-separator-multi-button] {
    grid-template-rows: 28px 28px !important;
  }
  [data-separator-wrapper][data-separator-multi-button] [data-expand-button] {
    height: 28px !important;
  }
  [data-expand-button] [data-icon] {
    width: 20px;
    height: 20px;
  }
  [data-expand-button]:hover {
    opacity: 1;
    background-color: hsl(var(--muted-foreground) / 0.15) !important;
  }
  [data-separator-content] {
    opacity: 0.5;
    font-size: 12px;
  }

  [data-separator="line-info"][data-separator-first] {
    margin-top: 4px;
  }
  [data-separator="line-info"][data-separator-last] {
    margin-bottom: 4px;
  }

  [data-disable-line-numbers][data-indicators='classic'] [data-column-content] {
    padding-inline-start: calc(2ch + 1ch);
  }
  [data-disable-line-numbers][data-indicators='classic'] [data-line-type='change-addition'] [data-column-content]::before,
  [data-disable-line-numbers][data-indicators='classic'] [data-line-type='change-deletion'] [data-column-content]::before {
    left: 1ch;
  }

  [data-diffs],
  [data-line] {
    background-color: transparent !important;
  }

  [data-line-type='context'] [data-column-number],
  [data-line-type='context-expanded'] [data-column-number] {
    background-color: transparent !important;
  }

  @media (pointer: fine) {
    [data-line-type='context']:hover:not([data-selected-line]) [data-column-number],
    [data-line-type='context-expanded']:hover:not([data-selected-line]) [data-column-number] {
      background-color: var(--diffs-bg-hover) !important;
    }
  }

  [data-code] {
    padding-bottom: 0 !important;
  }
  [data-code]::-webkit-scrollbar {
    height: 8px !important;
    background: transparent !important;
  }
  [data-code]::-webkit-scrollbar-track {
    background: transparent !important;
  }
  [data-code]::-webkit-scrollbar-thumb {
    background-color: transparent !important;
    border-radius: 4px !important;
  }
  [data-code]:hover::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.3) !important;
  }

  [data-diffs][data-theme-type='light'] {
    --diffs-gap-style: none !important;
    --diffs-light-bg: hsl(var(--background)) !important;
    --diffs-bg-buffer-override: transparent !important;
    --diffs-bg-context-override: transparent !important;
    --diffs-bg-separator-override: transparent !important;
    --diffs-light-addition-color: hsl(152, 38%, 36%) !important;
    --diffs-bg-addition-override: hsl(152, 30%, 93%) !important;
    --diffs-bg-addition-number-override: hsl(152, 30%, 90%) !important;
    --diffs-bg-addition-hover-override: hsl(152, 30%, 87%) !important;
    --diffs-light-deletion-color: hsl(4, 48%, 43%) !important;
    --diffs-bg-deletion-override: hsl(4, 38%, 94%) !important;
    --diffs-bg-deletion-number-override: hsl(4, 38%, 91%) !important;
    --diffs-bg-deletion-hover-override: hsl(4, 38%, 88%) !important;
    --diffs-fg-number-override: hsl(var(--muted-foreground)) !important;
  }

  [data-diffs][data-theme-type='dark'] {
    --diffs-gap-style: none !important;
    --diffs-dark-bg: hsl(var(--background)) !important;
    --diffs-bg-buffer-override: transparent !important;
    --diffs-bg-context-override: transparent !important;
    --diffs-bg-separator-override: transparent !important;
    --diffs-bg-hover-override: hsl(var(--accent)) !important;
    --diffs-dark-addition-color: hsl(152, 32%, 46%) !important;
    --diffs-bg-addition-override: hsl(152, 16%, 17%) !important;
    --diffs-bg-addition-number-override: hsl(152, 16%, 15%) !important;
    --diffs-bg-addition-hover-override: hsl(152, 16%, 21%) !important;
    --diffs-dark-deletion-color: hsl(4, 32%, 50%) !important;
    --diffs-bg-deletion-override: hsl(4, 16%, 17%) !important;
    --diffs-bg-deletion-number-override: hsl(4, 16%, 15%) !important;
    --diffs-bg-deletion-hover-override: hsl(4, 16%, 21%) !important;
    --diffs-fg-number-override: hsl(var(--muted-foreground)) !important;
  }
`
