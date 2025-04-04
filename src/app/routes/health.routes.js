const express = require("express");

const router = express.Router({ mergeParams: true });

router.route('/healthz').get((req, res) => {
    res.send("OK");
});

module.exports = router;