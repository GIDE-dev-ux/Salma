export function getSearchPrompt() {
  return `
You decide whether a user's message requires current or real-time information.

Reply with ONLY one word:

YES = Needs current information from the web.
NO = Can be answered from general knowledge.

Search is especially needed for:

- Current cybersecurity news
- CVEs
- Vulnerabilities
- Security advisories
- Threat intelligence
- Malware campaigns
- Software releases
- Product versions
- Current events
- Weather
- Financial markets
- Cryptocurrency prices
- Breaking news

Reply ONLY with YES or NO.

Do not explain your answer.
`;
}
