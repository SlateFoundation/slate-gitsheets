// dependencies
const Repository = require('gitsheets/lib/Repository')
const { parse: csvParse } = require('fast-csv')

// constants
const { EMPTY_TREE_HASH } = require('./constants')

// library
async function extractCBLGoogleSheet ({ ref, url, emptyCommit }) {

  // open Slate repo
  let repo = await Repository.getFromEnvironment({ ref })
  let git = await repo.getGit()
  let slateAncestor = await repo.resolveRef()

  if (!slateAncestor) {
    // initialize ref
    slateAncestor = await git.commitTree(EMPTY_TREE_HASH, {
      m: `↥ initialize gitsheets workspace ${ref}`
    })
    repo = await Repository.getFromEnvironment({ ref: slateAncestor })
    git = await repo.getGit()
  }

  const sheets = await repo.openSheets()

  // (re-)initialize sheets
  for (const sheetName of ['competency_areas', 'competencies', 'competency_skills']) {
    sheets[sheetName] = await repo.openSheet(sheetName, {
      config: require(`./templates/${sheetName}`)
    })
    await sheets[sheetName].writeConfig()
    await sheets[sheetName].clear()
  }

  // initialize `got` instance with Slate API wrapper
  const got = require('got')

  // load index sheet
  console.log('Loading index sheet...')
  const indexCsvStream = csvParse({ headers: true })
  got.stream(url).pipe(indexCsvStream);

  for await (const indexRow of indexCsvStream) {
    const competencyArea = {
      code: indexRow.Code,
      title: indexRow.Title
    }

    sheets.competency_areas.upsert(competencyArea)

    // load competency sheet
    console.log(`Loading competency area ${indexRow.Code} sheet...`)
    const competencyCsvStream = csvParse({ headers: true })
    got.stream(indexRow.CSV).pipe(competencyCsvStream);

    let currentCompetency
    for await (const competencyRow of competencyCsvStream) {
      if (competencyRow.Type == 'Competency Statement') {
        currentCompetency = {
          competency_area_code: indexRow.Code,
          code: competencyRow.Code,
          descriptor: competencyRow.Descriptor,
          statement: competencyRow.Statement
        }

        sheets.competencies.upsert(currentCompetency)
      } else if (competencyRow.Type == 'Standard') {
        if (!currentCompetency) {
          throw new Error(`Encountered skill row before any competency row`)
        }

        const skill = {
          competency_code: currentCompetency.code,
          code: competencyRow.Code,
          descriptor: competencyRow.Descriptor,
          statement: competencyRow.Statement,
          evidence_required: {}
        }

        for (const erSpec of competencyRow.ER.split(/\s*,\s*/)) {
          const [portfolio, evidence_required] = erSpec.split(/\s*:\s*/)
          skill.evidence_required[portfolio] = parseInt(evidence_required, 10)
        }


        sheets.competency_skills.upsert(skill)
      } else {
        throw new Error(`Unhandled competency row type: ${competencyRow.Type}`)
      }
    }
  }

  // save result
  const workspace = await repo.getWorkspace()
  const treeHash = await workspace.root.write()

  if (emptyCommit || treeHash !== await git.getTreeHash(slateAncestor)) {
    const commitHash = await git.commitTree(treeHash, {
      p: slateAncestor,
      m: `⭆ extract competencies from Google Sheet\n\nExtracted-from: ${url}`
    })
    await git.updateRef(`refs/heads/${ref}`, commitHash)
    console.log(`committed new Slate tree to "${ref}": ${slateAncestor}->${commitHash}`)
    return commitHash
  } else {
    console.log('Slate tree unchanged')
  }
}

// exports
module.exports = extractCBLGoogleSheet
