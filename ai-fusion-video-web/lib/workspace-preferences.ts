export const WORKSPACE_NAVIGATION_COOKIE = "baotuo-navigation-collapsed";
export const WORKSPACE_ASSISTANT_COOKIE = "baotuo-assistant-collapsed";

export function setWorkspacePreference(name: string, collapsed: boolean) {
  document.cookie = `${name}=${collapsed ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
