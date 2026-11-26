export function instagramProfileUrl(input: string) {
  // Accetta i parametri dei link condivisi e conserva soltanto il profilo.
  const match = /^https:\/\/(?:www\.)?instagram\.com\/([a-z0-9_](?:[a-z0-9._]{0,28}[a-z0-9_])?)\/?(?:[?#]\S*)?$/i.exec(input.trim());
  const username = match?.[1]?.toLowerCase();
  if (!username || username.includes("..") || /^(accounts|about|developer|direct|explore|legal|p|reel|reels|stories|tv)$/.test(username)) return null;
  return `https://www.instagram.com/${username}/`;
}
