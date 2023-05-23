const Battleships = artifacts.require("Battleships");

contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
        await battleships.newGame(false, {from: accounts[0]});
        await battleships.joinGame(1, {from: accounts[1]});
        await battleships.proposeStake(1, 5000);
        await battleships.proposeStake(1, 5000, {from: accounts[1]});
        await battleships.payStake(1, {value: 5000});
        await battleships.payStake(1, {from: accounts[1], value: 5000});
        const p0_board = '0x1'
        const p1_board = '0x2'
        await battleships.PlaceShips(1, p0_board);
        await battleships.PlaceShips(1, p0_board, {from: accounts[1]});
    });
    describe("Positive tests", async () =>{
        it("Assert correct setup:", async () =>{
            const reply = await battleships.checkGameState(1);
            assert.equal(reply, 4, "Failed Setup");
        })
        it("Firing a shot from player 1.", async () =>{
            const reply = await battleships.FireTorpedo(1, 0, 4);
            assert.equal(reply.logs[0].event, 'ShotsFired', "Event of type ShotsFired did not fire.");
            const status = await battleships.checkGameState(1);
            assert.equal(status, 5, "State machine failed at 27");
        })
        it("Checking the shot from player 2.", async () =>{
            // TODO: CHANGE MAGIC NUMBER
            const reply = await battleships.ConfirmShot(1, 0, 4, false, '0x4', {from: accounts[1]})
            assert.equal(reply.logs[0].event, 'ShotsChecked', "Event of type ShotsChecked did not fire.");
            const status = await battleships.checkGameState(1);
            assert.equal(status, 6, "State machine failed at 34");
        })
        it("Firing back from player 2.", async () =>{
            // TODO: CHANGE MAGIC NUMBER
            const reply = await battleships.FireTorpedo(1, 5, 2, {from: accounts[1]})
            assert.equal(reply.logs[0].event, 'ShotsFired', "Event of type ShotsFired did not fire.");
            const status = await battleships.checkGameState(1);
            assert.equal(status, 7, "State machine failed at 41");
        })
        it("Checking the shot from player 1.", async () =>{
            // TODO: CHANGE MAGIC NUMBER
            const reply = await battleships.ConfirmShot(1, 0, 4, false, '0x4')
            assert.equal(reply.logs[0].event, 'ShotsChecked', "Event of type ShotsChecked did not fire.");
            const status = await battleships.checkGameState(1);
            assert.equal(status, 4, "State machine failed at 49");
        })
    });
});