// global variable to store the id of our currently joined game
var currGameID = 0;
var ships_placed = 0; // global variable to keep track of the number of ships placed
// global boolean array to keep track of the player's placed ships, 64 positions, initially all false
var ships = new Array(64).fill(false);
// global boolean array to keep track of the player's hits, 64 positions, initially all false
var hits = new Array(64).fill(false);
// Create the first grid dynamically
// get the html element 'your-grid' by id and assign it to a variable
var grid1 = document.getElementById("your-grid");
var grid2 = document.getElementById("opponent-grid");
var grids = [grid1, grid2];
grids.forEach(element => {
    for (var i = 0; i < 9; i++) {
        for (var j = 0; j < 9; j++) {
            var tile = document.createElement("div");
            if (j === 0 || i === 8) {
                // the first tile in each row is a label
                tile.className = "tile-label";
                tile.style.pointerEvents = "none";
                // write the numbers '1' to '8'in the first column
                if (j === 0 && i >= 0) {
                    tile.innerHTML = 8 - i;
                }
                // write the letter 'A' to 'H' in the last row
                if (i === 8 && j > 0) {
                    tile.innerHTML = String.fromCharCode(64 + j);
                }
            } else {
                tile.className = "tile";
                tile.dataset.index = i * 8 + j - 1; // Assigning a unique index to each tile
                tile.addEventListener("click", handleClick);
            }
            element.appendChild(tile);
        }
    }
});
// blur the a grid, then disable it
function disableGrid(element) {
    element.style.filter = "blur(5px)";
    element.style.pointerEvents = "none";
    // disable the reset-board-button
    var resetBoardButton = document.getElementById("reset-board-btn");
    resetBoardButton.disabled = true;
}

// grid2 starts out disabled, we enable it after the send-grid phase of the game
disableGrid(grid1);
disableGrid(grid2);

// remove the blur from a grid and enable it
// the blur should be removed with a 300ms transition
function enableGrid(element) {
    element.style.transition = "filter 0.3s ease-in-out";
    element.style.filter = "blur(0px)";
    element.style.pointerEvents = "auto";
    var resetBoardButton = document.getElementById("reset-board-btn");
    resetBoardButton.enabled = true;
}

function resetBoard() {
    // Set every tile on the player's board to its default state and make them clickable again
    var tiles = document.querySelectorAll("#your-grid .tile");
    for (var i = 0; i < tiles.length; i++) {
        tiles[i].style.pointerEvents = "auto";
        // set the background color to the same one found in the .tile class
        tiles[i].style = getComputedStyle(tiles[i]);
        // re-enable the tile
        tiles[i].enabled = true;
    }
    // reset the global variables
    ships_placed = 0;
    ships = new Array(64).fill(false);
}

// bind the reset-board-button on click event to the resetBoard function
// this button must be disabled once the board has been submitted
var resetBoardButton = document.getElementById("reset-board-btn");
resetBoardButton.addEventListener("click", resetBoard);

function handleClick(event) {
    // Find the parent grid element of the clicked tile
    var grid = event.target.closest('.grid');

    // Get the clicked tile's index
    var index = event.target.dataset.index;
    // make the tile unclickable
    event.target.style.pointerEvents = "none";
    // change the tile's color to grey if it's in the first grid, red if it's in the second grid
    if (grid.id === "your-grid" && ships_placed < 20) {
        event.target.style.backgroundColor = "grey";
        ships[index] = true; // set the corresponding position in the ships array to true
        // also increment the global counter 'ships_placed' by one
        ships_placed++;
    } else if (grid.id === "opponent-grid") {
        event.target.style.backgroundColor = "red";
    }
    // disable every tile in the first grid once 20 ships have been placed
    if (ships_placed === 20) {
        var tiles = document.querySelectorAll("#your-grid .tile");
        for (var i = 0; i < tiles.length; i++) {
            tiles[i].style.pointerEvents = "none";
        }
    }
}

// debug button
var printGameStateButton = document.getElementById("print-game-state-btn");
printGameStateButton.addEventListener("click", printGameState);
// and its associated function
function printGameState() {
    console.log("Ships placed: " + ships_placed);
    console.log("Ships: " + ships);
    console.log("Hits: " + hits);
    console.log("CurrGameID: " + currGameID);
}

// the actual web3 app
App = {
    web3Provider: null,
    contracts: {},

    init: async function() {
        await App.initWeb3();
        await App.initContract();
        App.bindEvents();
    },

    initWeb3: async function() {
        // Modern dapp browsers...
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);

        return App.initContract();
    },

    initContract: function() {
        return new Promise(function(resolve, reject) {
            $.getJSON('Battleships.json', function(data) {
                // Get the necessary contract artifact file and instantiate it with @truffle/contract
                var BattleshipsArtifact = data;
                App.contracts.Battleships = TruffleContract(BattleshipsArtifact);

                // Set the provider for our contract
                App.contracts.Battleships.setProvider(App.web3Provider);

                resolve();
            }).fail(function(error) {
                reject(error);
            });
        });
    },

    bindEvents: function() {
        // using the same syntax as the example below, create binding for all components of our app
        $(document).on('click', '#opponent-grid .tile', App.opponentGridClick);
        // bind the click event on tiles in the first grid to the handleTileClick function
        $(document).on('click', '#your-grid .tile', App.playerGridClick);
        $(document).on('click', '#new-public-game-btn', function() {
            App.newGame(false);
        });
        $(document).on('click', '#new-private-game-btn', function() {
            App.newGame(true);
        });
        $(document).on('click', '#join-game-btn', function() {
            App.joinGame();
        });
        // Listen for all events emitted by the contract
        App.contracts.Battleships.deployed().then(function(instance) {
            instance.ShareID({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if (!error) {
                    // we do nothing here. The player's board is enabled in the AcceptingBoards event
                } else {
                    console.error('Error:', error);
                }
            });
            instance.GameStart({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.SuggestedStake({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.GamePayable({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.StakePaid({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.AcceptingBoards({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // in this state we enable the player's board if and only if the argument is the player's address and the gameID is the one we're currently playing
                    if(event.args._gameID.c[0] === currGameID) {
                        enableGrid(grid1);
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.BoardAcknowledgeEvent({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.PlayerZeroTurn({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.ShotsFired({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.ShotsChecked({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.RequestBoard({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.Victory({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.Foul({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                } else {
                    console.error('Error:', error);
                }
            });
        });
    },

    newGame: function(isPrivate) {
        // call the newGame function in the contract
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.newGame(isPrivate, {from: account});
            }).then(function(result) {
                // this is how deep we must go to actually get the gameID
                currGameID = parseInt(result.logs[0].args._gameID.c[0]);
                return;
            }).catch(function(err) {
                console.log(err.message);
            });
        });
    },

    joinGame: function() {
        // get number from input field
        target = document.getElementById("game-id-input");
        var gameID = parseInt(target.value);
        if(isNaN(gameID)) { 
            gameID = parseInt(0);
        }
        console.log(gameID);
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.joinGame(gameID, {from: account});
            }).then(function(result) {
                // this is how deep we must go to actually get the gameID
                console.log(result);
                // set currGameID to the gameID we just joined
                currGameID = parseInt(result.logs[0].args._gameID.c[0]);
                // we need to handle the ShareID event outside this function
                return;
            }).catch(function(err) {
                console.log(err.message);
            });
        });
    },

    playerGridClick: function(event) {
        var index = event.target.dataset.index;
        console.log("Your grid " + Number(index));
    },

    opponentGridClick: function(event) {
        var index = event.target.dataset.index;
        console.log("Opponent's grid " + Number(index));
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    });
});
