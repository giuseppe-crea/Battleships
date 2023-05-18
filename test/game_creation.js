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
    describe("Joining an existing game by id.", async () => {
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
    describe("Joining an existing game at random.", async () => {
      it("Creating two new games.", async () => {
        // create a public - private - public game sandwich
        const newGameOne = await battleships.newGame(false, {from: accounts[2]});
        assert.equal(newGameOne.logs[0].event, 'ShareID', "Event of type ShareID did not fire.");
        assert.equal(newGameOne.logs[0].args[1], accounts[2], "Event was emitted for the wrong recipient.");
        assert.equal(newGameOne.logs[0].args[2], 2, "Returned ID was not 2.");
        const newGameTwo = await battleships.newGame(true, {from: accounts[3]});
        assert.equal(newGameTwo.logs[0].event, 'ShareID', "Event of type ShareID did not fire.");
        assert.equal(newGameTwo.logs[0].args[1], accounts[3], "Event was emitted for the wrong recipient.");
        assert.equal(newGameTwo.logs[0].args[2], 3, "Returned ID was not 3.");
        const newGameThree = await battleships.newGame(false, {from: accounts[6]});
        assert.equal(newGameThree.logs[0].event, 'ShareID', "Event of type ShareID did not fire.");
        assert.equal(newGameThree.logs[0].args[1], accounts[6], "Event was emitted for the wrong recipient.");
        assert.equal(newGameThree.logs[0].args[2], 4, "Returned ID was not 4.");
      });
      it("Joining first open game (#2) with accounts[4].", async () => {
        const currGames = await battleships.joinGame(0, {from: accounts[4]});
        // catch the emitted start game event
        assert.equal(currGames.logs[0].event, 'GameStart', "Event of type GameStart did not fire.");
        assert.equal(currGames.logs[0].args[0], 2, "Event was emitted for the wrong gameID.");
        assert.equal(currGames.logs[0].args[1], accounts[2], "Event was emitted for the wrong host.");
        assert.equal(currGames.logs[0].args[2], accounts[4], "Event was emitted for the wrong challenger.");
      });
      it("Game #2 should have account[4] as second player.", async () => {
        const currGames = await battleships.checkGamePlayerTwo(2);
        assert.equal(currGames, accounts[4], "Wrong second address for game #2.")
      });
      it("Game #2 should be in 'setting stake' state.", async () => {
        const currGames = await battleships.checkGameState(2);
        assert.equal(currGames, 1, "Wrong state for game #2.")
      });
      it("Joining second open game (#4) with accounts[4].", async () => {
        const currGames = await battleships.joinGame(0, {from: accounts[4]});
        // catch the emitted start game event
        assert.equal(currGames.logs[0].event, 'GameStart', "Event of type GameStart did not fire.");
        assert.equal(currGames.logs[0].args[0], 4, "Event was emitted for the wrong gameID.");
        assert.equal(currGames.logs[0].args[1], accounts[6], "Event was emitted for the wrong host.");
        assert.equal(currGames.logs[0].args[2], accounts[4], "Event was emitted for the wrong challenger.");
      });
      it("Game #4 should have account[4] as second player.", async () => {
        const currGames = await battleships.checkGamePlayerTwo(4);
        assert.equal(currGames, accounts[4], "Wrong second address for game #4.")
      });
      it("Game #4 should be in 'setting stake' state.", async () => {
        const currGames = await battleships.checkGameState(4);
        assert.equal(currGames, 1, "Wrong state for game #4.")
      });
      // finally, try joining the private game
      it("Joining private game with ID #3 on accounts[4].", async () => {
        const currGames = await battleships.joinGame(3, {from: accounts[4]});
        // catch the emitted start game event
        assert.equal(currGames.logs[0].event, 'GameStart', "Event of type GameStart did not fire.");
        assert.equal(currGames.logs[0].args[0], 3, "Event was emitted for the wrong gameID.");
        assert.equal(currGames.logs[0].args[1], accounts[3], "Event was emitted for the wrong host.");
        assert.equal(currGames.logs[0].args[2], accounts[4], "Event was emitted for the wrong challenger.");
      });
      it("Game #3 should have account[4] as second player.", async () => {
        const currGames = await battleships.checkGamePlayerTwo(3);
        assert.equal(currGames, accounts[4], "Wrong second address for game #3.")
      });
      it("Game #3 should be in 'setting stake' state.", async () => {
        const currGames = await battleships.checkGameState(3);
        assert.equal(currGames, 1, "Wrong state for game #3.")
      });
    });
});
