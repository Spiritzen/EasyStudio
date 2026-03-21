import { useAIStore } from '../../store/aiStore';

export function useAI() {
  const { apiKey, setGenerating, setError, addPromptHistory } = useAIStore();

  const generateSVG = async (prompt: string): Promise<string | null> => {
    if (!apiKey) {
      setError('Veuillez entrer votre clé API Anthropic.');
      return null;
    }

    setGenerating(true);
    setError(null);
    addPromptHistory(prompt);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system:
            'Tu es un générateur SVG expert. Réponds UNIQUEMENT avec du code SVG valide, sans markdown, sans explication, sans balise ```svg. Commence directement par <svg et termine par </svg>. Le SVG doit être dans un viewBox="0 0 400 400", avec des formes adaptées à un logo professionnel.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg =
          response.status === 401
            ? 'Clé API invalide ou expirée.'
            : response.status === 429
            ? 'Quota dépassé. Réessayez plus tard.'
            : `Erreur API (${response.status}): ${err?.error?.message || 'Inconnu'}`;
        setError(msg);
        return null;
      }

      const data = await response.json();
      const svgText: string = data.content?.[0]?.text || '';

      if (!svgText.includes('<svg')) {
        setError('La réponse ne contient pas de SVG valide.');
        return null;
      }

      // Extract SVG content
      const start = svgText.indexOf('<svg');
      const end = svgText.lastIndexOf('</svg>') + 6;
      return svgText.slice(start, end);
    } catch (e: any) {
      setError(`Erreur réseau : ${e.message}`);
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return { generateSVG };
}
