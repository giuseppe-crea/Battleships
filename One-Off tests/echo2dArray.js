const Battleships = artifacts.require("Battleships");

contract("Battleships", function (accounts) {
    let battleships;

    before(async () => {
        battleships = await Battleships.deployed();
    });
    describe("test", async () => {
        it("Echo'ing 2d array", async () => {
            const array = [['0x35b47ec3f55b71d6589203440915d2ef7280ff31d26085f81a04730b0655d961','0xbc49c41a6e963445b9f692012bd7dfc893d239ca45ab7b217fdbab0816fc0509'],['0x35b47ec3f55b71d6589203440915d2ef7280ff31d26085f81a04730b0655d961','0xbc49c41a6e963445b9f692012bd7dfc893d239ca45ab7b217fdbab0816fc0509']];
            const currGames = await battleships.echo2dArray(array);
            console.log(currGames);
        });
    });
});