const Battleships = artifacts.require("Battleships");
const board_root = ['0x1', '0x2'];

contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
        await battleships.newGame(false, {from: accounts[0]});
        await battleships.joinGame(1, {from: accounts[1]});
        await battleships.PlaceShips(1, board_root[0]);
        await battleships.PlaceShips(1, board_root[1], {from: accounts[1]});
        await battleships.proposeStake(1, 5000);
        await battleships.proposeStake(1, 5000, {from: accounts[1]});
        const one = await battleships.checkGameState(1);
        assert.equal(one, Battleships.GameStates.ACCEPTING_PAYMENT, "Failed Setup");
        const two = await battleships.payStake(1, {value: 5000});
        assert.equal(two.logs[0].event, 'StakePaid', "Event of type StakePaid did not fire.");
        assert.equal(two.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
        assert.equal(two.logs[0].args[1], accounts[0], "Event was emitted for the wrong from.");
        const three = await battleships.payStake(1, {from: accounts[1], value: 5000});
        assert.equal(three.logs[0].event, 'StakePaid', "Event of type StakePaid did not fire.");
        assert.equal(three.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
        assert.equal(three.logs[0].args[1], accounts[1], "Event was emitted for the wrong from.");
    });

    describe("Just the one test:", async () => {
        it("Abandoning a game on p1.", async () =>{
            const reply = await battleships.AbandonGame(1, {from: accounts[0]});
            console.log("Gas cost of abandoning a game: " + reply.receipt.gasUsed);
            assert.equal(reply.logs[0].event, 'RequestBoard', "Event of type RequestBoard did not fire.");
            assert.equal(reply.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(reply.logs[0].args[1], accounts[1], "Event was emitted for the wrong from.");
        });
    });
});