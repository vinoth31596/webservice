let chai = require("chai");
let chaiHttp = require("chai-http");
const res = require("express/lib/response");
let server = require("../app");

// Assertion Style
chai.should();

chai.use(chaiHttp);

describe('Tasks API', () => {
    /**
     * Test GET APIS
    */
    describe("GET /healthz", () => {
        it("GET '/healthz' API test", (done) => {
            chai.request(server)
                .get("/healthz")
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                })
        })
    })
})
