'use strict'
const env = require('./test-env/init')()
const server = require('../lib/server')
const tap = require('tap')
const request = require('request')
const _ = require('lodash')

const headers = env.getTestAuthHeaders(env.users.sysadminUser.email)

let docRefTestEnv = (t, test) => {
  env.initDB((err, db) => {
    t.error(err)

    server.start((err) => {
      t.error(err)

      const patients = env.testPatients()
      const pracs = env.testPractitioners()
      const orgs = env.testOrganizations()

      env.createOrganization(t, orgs.greenwood, () => {
        env.createOrganization(t, orgs.redwood, () => {
          env.createPractitioner(t, pracs.alison, orgs.greenwood, () => {
            env.createPractitioner(t, pracs.henry, orgs.redwood, () => {
              env.createPatient(t, patients.charlton, () => {
                env.createPatient(t, patients.emmarentia, () => {
                  const docRef = _.cloneDeep(require('./resources/DocumentReference-1'))
                  const docRef2 = _.cloneDeep(require('./resources/DocumentReference-1'))
                  docRef.subject.reference = patients.charlton.resource
                  docRef.author.reference = pracs.alison.resource
                  docRef2.subject.reference = patients.emmarentia.resource
                  docRef2.author.reference = pracs.henry.resource
                  docRef2.class.coding[0].code = '47039-3'
                  docRef2.class.coding[0].display = 'Inpatient Admission history and physical note'

                  env.createResource(t, 'DocumentReference', docRef, (err, ref) => {
                    env.createResource(t, 'DocumentReference', docRef2, (err, ref2) => {
                      t.error(err)
                      test(db, patients, pracs, orgs, [ref, ref2], () => {
                        env.clearDB((err) => {
                          t.error(err)
                          server.stop(() => {
                            t.end()
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
}

tap.test('document reference should support searches on patient reference', (t) => {
  docRefTestEnv(t, (db, patients, pracs, orgs, docRefs, done) => {
    request({
      url: `http://localhost:3447/fhir/DocumentReference?patient=${patients.charlton.resource}`,
      headers: headers,
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(`DocumentReference/${body.entry[0].resource.id}`, docRefs[0], 'body should contain correct match')
      done()
    })
  })
})

tap.test('document reference should support searches on status (matching)', (t) => {
  docRefTestEnv(t, (db, patients, pracs, orgs, docRefs, done) => {
    request({
      url: `http://localhost:3447/fhir/DocumentReference?status=current`,
      headers: headers,
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 2, 'body should contain two results')
      done()
    })
  })
})

tap.test('document reference should support searches on status (non-matching)', (t) => {
  docRefTestEnv(t, (db, patients, pracs, orgs, docRefs, done) => {
    request({
      url: `http://localhost:3447/fhir/DocumentReference?status=superseded`,
      headers: headers,
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 0, 'body should contain no results')
      done()
    })
  })
})

tap.test('document reference should support searches on class', (t) => {
  docRefTestEnv(t, (db, patients, pracs, orgs, docRefs, done) => {
    request({
      url: `http://localhost:3447/fhir/DocumentReference?class=34117-2`,
      headers: headers,
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(`DocumentReference/${body.entry[0].resource.id}`, docRefs[0], 'body should contain correct match')
      done()
    })
  })
})

tap.test('document reference should support searches on class with system', (t) => {
  docRefTestEnv(t, (db, patients, pracs, orgs, docRefs, done) => {
    request({
      url: `http://localhost:3447/fhir/DocumentReference?class=http%3A%2F%2Fhl7.org%2Ffhir%2FValueSet%2Fc80-doc-classcodes|34117-2`,
      headers: headers,
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(`DocumentReference/${body.entry[0].resource.id}`, docRefs[0], 'body should contain correct match')
      done()
    })
  })
})

tap.test('document reference should support searches on type', (t) => {
  docRefTestEnv(t, (db, patients, pracs, orgs, docRefs, done) => {
    request({
      url: `http://localhost:3447/fhir/DocumentReference?type=History+and+Physical`,
      headers: headers,
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 2, 'body should contain two results')
      done()
    })
  })
})
