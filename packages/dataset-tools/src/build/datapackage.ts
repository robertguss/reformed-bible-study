import { type ResourceRecord, licenseUrl } from "@reformed-bible/core"

/** A Frictionless Data Package (v2) index of the release archive, one data resource per dataset resource. */
export const buildDatapackage = (
  release: string,
  records: ReadonlyArray<ResourceRecord>,
  pathsByResource: ReadonlyMap<string, ReadonlyArray<string>>,
) => ({
  $schema: "https://datapackage.org/profiles/2.0/datapackage.json",
  name: "reformed-bible-study-dataset",
  title: "Reformed Bible study dataset",
  version: release,
  description:
    "Openly licensed Bible translations, Reformed commentaries and confessions, cross-references and original-language data, indexed by passage under KJV versification.",
  resources: records
    .filter((record) => (pathsByResource.get(record.id) ?? []).length > 0)
    .map((record) => {
      const url = licenseUrl(record.license.spdx)
      return {
        name: record.id,
        title: record.title,
        description: `${record.creator}. ${record.edition}.`,
        path: pathsByResource.get(record.id) ?? [],
        format: "json",
        mediatype: "application/json",
        licenses: [
          url === undefined
            ? { title: record.license.spdx }
            : { title: record.license.spdx, path: url },
        ],
        sources: [{ title: record.title, path: record.source.url }],
      }
    }),
})
