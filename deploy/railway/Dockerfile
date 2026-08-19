FROM ghcr.io/hydra-db/hydradb:0.1.1

COPY --chmod=755 deploy/railway/hydradb-entrypoint.sh /usr/local/bin/blastpath-hydradb-entrypoint

ENTRYPOINT ["/usr/local/bin/blastpath-hydradb-entrypoint"]
CMD ["graph-node"]
