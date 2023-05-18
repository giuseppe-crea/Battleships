const Battleships = artifacts.require("Battleships");

contract("Battleships", function (accounts) {
    let battleships;
  
    before(async () => {
        battleships = await Battleships.deployed();
    });
    describe("Creating a new game", async () => {
      it("No games exist in the contract.", async () => {
        const currGames = await battleships.checkGameState(1);
        assert.equal(currGames, 8, "Somehow game #1 exists!");
      });
      it("One game now exists in the contract.", async () => {
        const newGameID = await battleships.newGame(false);
        // grab the event and parse it
        // the format is (from, to, game id)
        assert.equal(newGameID.logs[0].event, 'ShareID', "Event of type ShareID did not fire.");
        assert.equal(newGameID.logs[0].args[1], accounts[0], "Event was emitted for the wrong recipient.");
        assert.equal(newGameID.logs[0].args[2], 1, "Returned ID was not 1.");
      });
      it("Checking state of game #1.", async () => {
        const currGames = await battleships.checkGameState(1);
        assert.equal(currGames, 0, "Somehow game #1 is not in state 0!");
      });
      it("Checking host for game #0", async () => {
        const playerOne = await battleships.checkGamePlayerOne(1);
        assert.equal(playerOne, accounts[0], "Game #1 has the wrong host!");
      });
    });

    describe("Joining an existing game", async () => {
      it("Game #1 should have no second player.", async () => {
        const currGames = await battleships.checkGamePlayerTwo(1);
        assert.equal(currGames, 0, "Somehow game #1 already has a second player!")
      });
      it("Joining game #1 with accounts[1].", async () => {
        const currGames = await battleships.joinGame(1, {from: accounts[1]});
        // catch the emitted start game event
        assert.equal(currGames.logs[0].event, 'GameStart', "Event of type GameStart did not fire.");
        assert.equal(currGames.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
        assert.equal(currGames.logs[0].args[1], accounts[0], "Event was emitted for the wrong host.");
        assert.equal(currGames.logs[0].args[2], accounts[1], "Event was emitted for the wrong challenger.");
      });
      it("Game #1 should have account[1] as second player.", async () => {
        const currGames = await battleships.checkGamePlayerTwo(1);
        assert.equal(currGames, accounts[1], "Wrong second address for game #1.")
      });
      it("Game #1 should be in 'setting stake' state.", async () => {
        const currGames = await battleships.checkGameState(1);
        assert.equal(currGames, 1, "Wrong state for game #1.")
      });
    });
});