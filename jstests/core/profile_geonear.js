// Confirms that profiled geonear execution contains all expected metrics with proper values.
// TODO SERVER-23257: Add keysExamined, docsExamined.
// TODO SERVER-23259: Add planSummary.
// TODO SERVER-23264: Add execStats.

(function() {
    "use strict";

    // For getLatestProfilerEntry and getProfilerProtocolStringForCommand
    load("jstests/libs/profiler.js");

    var conn = new Mongo(db.getMongo().host);
    var testDB = conn.getDB("profile_geonear");
    assert.commandWorked(testDB.dropDatabase());
    var coll = testDB.getCollection("test");

    testDB.setProfilingLevel(2);

    //
    // Confirm metrics for distinct with query.
    //
    var i;
    for (i = 0; i < 10; ++i) {
        assert.writeOK(coll.insert({a: i, loc: {type: "Point", coordinates: [i, i]}}));
    }
    assert.commandWorked(coll.createIndex({loc: "2dsphere"}));

    assert.commandWorked(testDB.runCommand(
        {geoNear: "test", near: {type: "Point", coordinates: [1, 1]}, spherical: true}));

    var profileObj = getLatestProfilerEntry(testDB);

    assert.eq(profileObj.ns, coll.getFullName(), tojson(profileObj));
    assert.eq(profileObj.op, "command", tojson(profileObj));
    assert.eq(profileObj.protocol, getProfilerProtocolStringForCommand(conn), tojson(profileObj));
    assert.eq(coll.getName(), profileObj.command.geoNear, tojson(profileObj));
    assert(profileObj.hasOwnProperty("responseLength"), tojson(profileObj));
    assert(profileObj.hasOwnProperty("millis"), tojson(profileObj));
    assert(profileObj.hasOwnProperty("numYield"), tojson(profileObj));
    assert(profileObj.hasOwnProperty("locks"), tojson(profileObj));

    // We cannot confirm "fromMultiPlanner" or "replanned" metrics as there can be at most one
    // valid index choice for geoNear. The reason for this is:
    //  - geoNear requires at least one "2d" or "2dsphere" index
    //  - geoNear requires there be at most one 2dsphere and at most one 2d index
    //  - geoNear will always prefer a 2d index over a 2dsphere index if both are defined
})();