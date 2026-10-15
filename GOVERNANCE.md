# Governance

## Who runs the project

CIV.IQ has one maintainer: Mark Sandford ([@mark-sandford](https://github.com/mark-sandford)). He reviews and merges every change, decides what ships, and is the contact for conduct reports and security reports (contact@civdotiq.org).

No foundation, board or company stands behind the project.

## How decisions get made

- **Fixes and documentation.** Open a pull request. The maintainer merges it if `npm run validate:all` passes and it follows [CONTRIBUTING.md](CONTRIBUTING.md).
- **Larger changes.** This means a new data source, a change to how data is stored or cached, or anything most visitors would notice. Open an issue first and describe the change. The maintainer decides and writes the reason in the issue.
- **Rules that are not up for debate.** Every fact comes from a government record, or the site says "data unavailable." Nothing is estimated and shown as real. Presentation is nonpartisan. Statistics describe patterns and never claim one thing caused another.

## Proposing a data source

Open a [feature request](https://github.com/civdotiq/civ.iq/issues/new?template=feature_request.yml) and include:

- the source and who publishes it
- a link to its API or bulk files, and its terms of use
- what it would add, and which pages would show it
- how often it updates, and any rate limits or key requirements

A source is accepted only if it is an official government record, or a named open dataset that republishes one. It must also be free to use and readable by a script. Accepted sources are listed in [docs/COVERAGE.md](docs/COVERAGE.md).

To report wrong or outdated data from a source we already use, open a [data quality issue](https://github.com/civdotiq/civ.iq/issues/new?template=data_quality.yml).

## Succession

The bus factor is one: the project depends on a single person. If the maintainer stops working on it, civdotiq.org will stop updating. The code (Apache-2.0) and the data (public domain) stay open, so anyone can fork the repository and run their own copy. No successor has been named. If that changes, this file will name them.

## Changing this document

The maintainer changes this document through a pull request, like any other file.
