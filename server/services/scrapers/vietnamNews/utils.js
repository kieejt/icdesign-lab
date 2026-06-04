export function dedupeNews(articles) {
  const uniqueArticles = []
  const seenUrls = new Set()

  for (const article of articles) {
    if (!article.url || !article.title || seenUrls.has(article.url)) continue
    seenUrls.add(article.url)
    uniqueArticles.push(article)
  }

  return uniqueArticles
}
