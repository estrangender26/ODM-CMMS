# Historical Environment-File Remediation

A production environment file was previously committed and later removed. Removing a file in a new commit does **not** remove it from Git history.

## Required manual actions

1. Rotate the database credentials that appeared in the historical file.
2. Rotate `JWT_SECRET` and invalidate issued JWTs as appropriate for the deployment.
3. Rotate `SESSION_SECRET` if cookies or sessions depend on it.
4. Review all branches, tags, forks, CI logs, deployment variable history, and backup artifacts for copied values.
5. Decide with repository administrators whether to remove the file from reachable Git history using `git filter-repo` or an equivalent approved process. Coordinate any required force-pushes and downstream clone remediation before rewriting history.
6. Enable GitHub secret scanning, push protection, and alerting for the repository.

Do not commit real `.env` files. Use `.env.example` and `.env.production.example` as templates, and store deployment values in the hosting provider's secret manager.
