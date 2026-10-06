// The look of the HTML panels on top of the game (track menu, editor buttons): CodeMask neon.

const style = document.createElement('style');
style.textContent = `
  .tool-panel { position: fixed; display: none; gap: 8px; font: 12px monospace; color: #e6ebf2;
                background: rgba(5, 6, 10, 0.92); border: 1px solid rgba(0, 240, 255, 0.45); padding: 10px 12px;
                z-index: 3; box-shadow: 0 0 18px rgba(0, 240, 255, 0.18); }
  .tool-panel button { font: 12px monospace; color: #00f0ff; background: #0b0d13; cursor: pointer;
                       border: 1px solid rgba(0, 240, 255, 0.5); padding: 5px 9px; text-align: left; }
  .tool-panel button:hover:not(:disabled) { background: rgba(0, 240, 255, 0.12); }
  .tool-panel button:disabled { color: rgba(230, 235, 242, 0.3); border-color: rgba(230, 235, 242, 0.15); cursor: default; }
  .tool-panel button.current { color: #ffd23f; border-color: #ffd23f; }
  .tool-panel input { font: 11px monospace; color: #e6ebf2; background: #0b0d13; border: 1px solid rgba(0, 240, 255, 0.3);
                      padding: 5px; width: 100%; box-sizing: border-box; }
  .tool-panel .note { color: rgba(0, 240, 255, 0.55); font-size: 11px; }
  .tool-panel h3 { margin: 0 0 2px; font: bold 14px monospace; color: #00f0ff; }
  #editor-bar { top: 8px; right: 8px; flex-direction: row; }
  #track-menu { top: 50%; left: 50%; transform: translate(-50%, -50%); flex-direction: column; width: min(440px, 90vw); }
`;
document.head.appendChild(style);
