/* Fills in the repository link on the privacy page from the site's own address
   (owner.github.io/repo/ maps to github.com/owner/repo), so no account name is hard-coded. */
(function () {
  var el = document.getElementById("repo"), host = location.hostname, m = /^([a-z0-9-]+)\.github\.io$/i.exec(host);
  if (!el || !m) return;
  var repo = location.pathname.split("/").filter(Boolean)[0] || "";
  if (!/^[A-Za-z0-9._-]+$/.test(repo)) return;
  var a = document.createElement("a");
  a.href = "https://github.com/" + m[1] + "/" + repo + "/issues";
  a.textContent = "github.com/" + m[1] + "/" + repo;
  a.rel = "noopener";
  el.textContent = " (";
  el.appendChild(a);
  el.appendChild(document.createTextNode(")"));
})();
