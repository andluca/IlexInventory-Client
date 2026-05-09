/**
 * src/features/shell/cmdk-items/agent.ts
 *
 * Pure function returning SpotlightActionGroupData for the Agent group.
 * One action: "Ask Ilex" or "Ask Ilex: '{query}'" when query is non-empty.
 *
 * Per ILE-9 Step 6.
 */

import type { SpotlightActionGroup } from './navigate'

export function buildAgentActions(
  query: string,
  openAgent: (q: string) => void,
): SpotlightActionGroup {
  const label = query.length > 0 ? `Ask Ilex: '${query}'` : 'Ask Ilex'
  return {
    group: 'Agent',
    actions: [
      {
        id: 'agent-ask',
        label,
        description: 'Open the Ask Ilex panel',
        keywords: ['agent', 'ilex', 'ask', 'ai', 'help'],
        onClick: () => openAgent(query),
      },
    ],
  }
}
