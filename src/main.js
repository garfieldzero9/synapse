import './style.css'
import './auth.js'

// Add some subtle interactivity to the landing page mockup
document.addEventListener('DOMContentLoaded', () => {
  const mockupInput = document.getElementById('demo-input');

  if (mockupInput) {
    mockupInput.addEventListener('click', () => {
      mockupInput.innerHTML = '<span style="color: var(--text-main);">I just had an idea for a YouTube video about the future of SaaS. It should focus on micro-SaaS, edge compute, and frictionless UI. Make it engaging.<span style="animation: cursor-blink 1s infinite;">|</span></span>';
      mockupInput.style.boxShadow = '0 0 15px rgba(79, 70, 229, 0.2)';

      // Simulate AI processing after 1.5s
      setTimeout(() => {
        mockupInput.innerHTML = `
          <div style="text-align: left; padding: 1rem; width: 100%;">
            <div style="color: var(--accent-1); font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem; text-transform: uppercase;">✨ Synapse Generated</div>
            <h3 style="color: white; margin-bottom: 0.5rem;">The Future of Micro-SaaS (YouTube Script Outline)</h3>
            <ul style="color: var(--text-muted); padding-left: 1.5rem; font-size: 0.95rem;">
              <li><strong>Hook:</strong> Why big SaaS is dying.</li>
              <li><strong>Trend 1:</strong> Edge computing changing speed expectations.</li>
              <li><strong>Trend 2:</strong> Frictionless UI as the core differentiator.</li>
            </ul>
          </div>
        `;
        mockupInput.style.borderColor = 'rgba(255,255,255,0.08)';
        mockupInput.style.boxShadow = 'none';
      }, 2000);
    });
  }
});

// Cursor animation
const style = document.createElement('style');
style.innerHTML = `
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;
document.head.appendChild(style);
