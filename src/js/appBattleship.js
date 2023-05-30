// global variable to store the id of our currently joined game
var currGameID = 0;
var areWeHost = false;
var ships_placed = 0; // global variable to keep track of the number of ships placed
var currGameState; // global variable to keep track of the current game state as described in the contract
// global boolean array to keep track of the player's placed ships, 64 positions, initially all false
var ships = new Array(64).fill(false);
// global boolean array to keep track of the player's hits, 64 positions, initially all false
var hits = new Array(64).fill(false);
var grid1 = document.getElementById("your-grid");
var grid2 = document.getElementById("opponent-grid");
var grids = [grid1, grid2];
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

// remainder from when we had a reset board button
const stateControlFunctions = {
    resetBoard: function() {
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
    },

    resetGlobals: function() {
        // reset the global variables
        ships_placed = 0;
        ships = new Array(64).fill(false);
        hits = new Array(64).fill(false);
        currGameID = 0;
        areWeHost = false;
        currGameState = 0;
        MerkleHelperFunctions.board = [];
        MerkleHelperFunctions.leafNodes = [];
        MerkleHelperFunctions.computedTree = null;
        MerkleHelperFunctions.board_root = 0x0;
    }
}

const MerkleHelperFunctions = {
    board: [],
    leafNodes: [],
    computedTree: null,
    board_root: 0x0,
    // function to generate the merkle trie from the ships array
    generatePlayerBoard: function(bool_board){
        // from the already filled board we generate the merkle trie
        for(var i = 0; i < 64; i++){
            // This implementation uses a random value for each node to ensure nobody can "guess" the whole board
            var board_elem = {
                tile: i,
                ship: bool_board[i]
            }
            this.board.push(board_elem);
        }
        this.leafNodes = this.board.map((_board) => 
            web3.utils.keccak256(web3.eth.abi.encodeParameters(['uint8','bool'],[_board.tile,_board.ship]))
        );
        this.computedTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
        this.board_root = computedTree.getHexRoot();
    }
}

const UIcontrolFunctions = {
    
    populateGrids: function() {
        // Create the first grid dynamically
        // get the html element 'your-grid' by id and assign it to a variable
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
    },

    disableGrid: function(element) {
        element.style.filter = "blur(5px)";
        element.style.pointerEvents = "none";    
    },

    // create functions to enable and disable each component of the app

    enableNewGameButtons: function() {
        var newPublicGameButton = document.getElementById("new-public-game-btn");
        var newPrivateGameButton = document.getElementById("new-private-game-btn");
        newPublicGameButton.disabled = false;
        newPrivateGameButton.disabled = false;
    },

    disableNewGameButtons: function() {
        var newPublicGameButton = document.getElementById("new-public-game-btn");
        var newPrivateGameButton = document.getElementById("new-private-game-btn");
        newPublicGameButton.disabled = true;
        newPrivateGameButton.disabled = true;
    },

    enableSubmitBoardButton: function() {
        var submitBoardButton = document.getElementById("submit-board-btn");
        submitBoardButton.disabled = false;
    },

    disableSubmitBoardButton: function() {
        var submitBoardButton = document.getElementById("submit-board-btn");
        submitBoardButton.disabled = true;
    },

    enableClaimWinningsButton: function() {
        var claimWinningsButton = document.getElementById("claim-winnings-btn");
        claimWinningsButton.disabled = false;
    },

    disableClaimWinningsButton: function() {
        var claimWinningsButton = document.getElementById("claim-winnings-btn");
        claimWinningsButton.disabled = true;
    },

    enableDeclareFoulButton: function() {
        var declareFoulButton = document.getElementById("declare-foul-btn");
        declareFoulButton.disabled = false;
    },

    disableDeclareFoulButton: function() {
        var declareFoulButton = document.getElementById("declare-foul-btn");
        declareFoulButton.disabled = true;
    },

    enableProposeStakeButton: function() {
        var proposeStakeButton = document.getElementById("propose-stake-btn");
        proposeStakeButton.disabled = false;
    },

    disableProposeStakeButton: function() {
        var proposeStakeButton = document.getElementById("propose-stake-btn");
        proposeStakeButton.disabled = true;
    },

    enableStakeInput: function() {
        var stakeInputField = document.getElementById("stake-value-input");
        stakeInputField.disabled = false;
    },

    disableStakeInput: function() {
        var stakeInputField = document.getElementById("stake-value-input");
        stakeInputField.disabled = true;
    },

    enableJoinGameButton: function() {
        var joinGameButton = document.getElementById("join-game-btn");
        joinGameButton.disabled = false;
    },

    disableJoinGameButton: function() {
        var joinGameButton = document.getElementById("join-game-btn");
        joinGameButton.disabled = true;
    },

    enableGameIDInput: function() {
        var stakeInputField = document.getElementById("game-id-input");
        stakeInputField.disabled = false;
    },

    disableGameIDInput: function() {
        var gameIDInputField = document.getElementById("game-id-input");
        gameIDInputField.disabled = true;
    },

    enableResetBoardButton: function() {
        var resetBoardButton = document.getElementById("reset-board-btn");
        resetBoardButton.disabled = false;
    },

    disableResetBoardButton: function() {
        var resetBoardButton = document.getElementById("reset-board-btn");
        resetBoardButton.disabled = true;
    },

    enableGrid: function(element) {
        element.style.transition = "filter 0.3s ease-in-out";
        element.style.filter = "blur(0px)";
        element.style.pointerEvents = "auto";
    },

    // unlike disableGrid, this function only disables pointer events, without blurring
    // it's used for the actual play phase of the game during which the user needs to see their own tiles
    lockGrid: function(grid) {
        grid.style.pointerEvents = "none";
    },

    unlockGrid: function(grid) {
        grid.style.pointerEvents = "auto";
    },

    initialGameUIState: function(){
        UIcontrolFunctions.populateGrids();
        UIcontrolFunctions.disableGrid(grid1);
        UIcontrolFunctions.disableGrid(grid2);
        UIcontrolFunctions.disableSubmitBoardButton();
        UIcontrolFunctions.disableClaimWinningsButton();
        UIcontrolFunctions.disableDeclareFoulButton();
        UIcontrolFunctions.disableProposeStakeButton();
        UIcontrolFunctions.disableStakeInput();
    },

    joinedGameUIState: function() {
        // obscure all join/new game buttons and the gameID input
        UIcontrolFunctions.disableJoinGameButton();
        UIcontrolFunctions.disableGameIDInput();
        UIcontrolFunctions.disableNewGameButtons();
        // set the placeholder text of gameID input to the gameID we just joined
        var gameIDInputField = document.getElementById("game-id-input");
        gameIDInputField.value = currGameID;
    },

    placingShipsUIState: function() {
        UIcontrolFunctions.enableGrid(grid1);
        // the activation of the submit board button is dealt with in the event listener for board tiles, as it's tied to the number of ships placed
    },

    settingStakeUIState: function() {
        UIcontrolFunctions.lockGrid(grid1);
        UIcontrolFunctions.enableProposeStakeButton();
        UIcontrolFunctions.enableStakeInput();
    },

    acceptingPaymentUIState: function() {
        UIcontrolFunctions.disableProposeStakeButton();
        UIcontrolFunctions.disableStakeInput();
        // the actual payment is processed in the accept button of the popup box which appears when the stake is set, in the event listener for the GamePayable event
        // ergo no "pay stake" button has to be enabled, or even exist
    },

    // we get to the main game loop, here all buttons 
    p0FiringUIState: function() {
        // player zero can click the grid, player one can't
        // this is effectively pointless as the contract already enforces the state machine, but we like it neat
        if(!areWeHost) {
            UIcontrolFunctions.lockGrid(grid2);
        } else{
            UIcontrolFunctions.unlockGrid(grid2);
        }
    },

    p1FiringUIState: function() {
        if(areWeHost) {
            UIcontrolFunctions.lockGrid(grid2);
        } else{
            UIcontrolFunctions.unlockGrid(grid2);
        }
    },

    // nothing actually happens here yet, but we might want to add a "waiting for opponent" message
    // the involved user won't have to manually input anything if using THIS client.
    p0CheckingUIState: function() {
    },

    p1CheckingUIState: function() {
    },

    updateTile: function(grid, index, isHit) {
        if(isHit){
            grid.children[index].style.backgroundColor = 'red';
            hits[index] = true;
        } 
        grid.children[index].innerHTML = 'X';
        grid.children[index].style.fontWeight = 'bold';
        grid.children[index].style.color = 'black';
        grid.children[index].verticalAlign = 'middle';
        grid.children[index].style.textAlign = 'center';
        grid.children[index].style.fontSize = '30px';
    },        

    // this is mostly used during the phases of the game concerning the stake, we register callbacks which tie into the contract to confirm or refuse payments
    createPopout: function(Title, Message, AcceptActionCallback, RefuseActionCallback, args, showCancel) {
        // notify player of the stake proposal, do this via popup box
        var modal = document.getElementById("myModal");
        var acceptBtn = document.getElementById("acceptBtn");
        var refuseBtn = document.getElementById("refuseBtn");
        var title = document.getElementById("modal-title");
        var message = document.getElementById("modal-message");
        // set the title and message of the popup box
        title.innerHTML = Title;
        message.innerHTML = Message;
        modal.style.display = "flex";
        if(!showCancel) {
            refuseBtn.style.display = "none";
        } else {
            refuseBtn.style.display = "flex";
        }
        acceptBtn.addEventListener("click", function() {
            // Add your code here for the accept action
            console.log("User clicked Accept");
            if(AcceptActionCallback != null)
                AcceptActionCallback(args);
            closeModal();
        });
        refuseBtn.addEventListener("click", function() {
            // Add your code here for the refuse action
            console.log("User clicked Refuse");
            if(RefuseActionCallback != null)
                RefuseActionCallback(args);
            closeModal();
        });
        function closeModal() {
            modal.style.display = "none";
        }
        window.addEventListener("click", function(event) {
            if (event.target == modal) {
                event.preventDefault(); // Prevent closing the modal by clicking outside
            }
        });
    },
}

UIcontrolFunctions.initialGameUIState();

function handleClick(event) {
    var grid = event.target.closest('.grid');
    var index = event.target.dataset.index;
    if (grid.id === "your-grid") {
        // if this is the player's grid we are placing a ship or removing an already placed ship
        // there's a limit of 20 ships which can be placed, disable the grid once this limit is reached
        if(ships[index]) {
            // if the tile is already occupied by a ship, remove it
            event.target.style = getComputedStyle(event.target);
            ships[index] = false;
            ships_placed--;
        } else if (!ships[index] && ships_placed < 20) {
            event.target.style.backgroundColor = "grey";
            // this is an array storing the value of each tile in the grid which we will use to generate the merkle trie
            ships[index] = true;
            ships_placed++;
        }
    } else if (grid.id === "opponent-grid") {
        // if this is the opponent's grid we are firing a shot, we need to tie this to the contract
        // TODO: rewrite a handleclick function specific for the opponent's grid and register it with the contract
        event.target.style.backgroundColor = "red";
        event.target.style.pointerEvents = "none";
    }
    if (ships_placed === 20) {
        UIcontrolFunctions.enableSubmitBoardButton();
    } else {
        UIcontrolFunctions.disableSubmitBoardButton();
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
    console.log("CurrGameState: " + currGameState);
    console.log("Our address: " + web3.eth.accounts[0]);  
}

// the actual web3 app
App = {
    web3Provider: null,
    contracts: {},
    currentBlockNumber: 0,
    initialBlockNumber: 0,

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
        await web3.eth.getBlockNumber(function(error, result) {
            if (!error) {
                currentBlockNumber = result;
                initialBlockNumber = currentBlockNumber;
                console.log("Initial block number: " + result);
            } else {
                console.error('Error:', error);
            }
        });

        return App.initContract();
    },

    updateBlockNumber: async function() {
        await web3.eth.getBlockNumber(function(error, result) {
            if (!error) {
                currentBlockNumber = result;
                console.log("Current block number: " + result);
            } else {
                console.error('Error:', error);
            }
        });
        return currentBlockNumber;
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
        $(document).on('click', '#submit-board-btn', function() {
            App.submitBoard();
        });
        $(document).on('click', '#claim-winnings-btn', function() {
            App.withdrawWinnings();
        });
        // Listen for all events emitted by the contract
        App.contracts.Battleships.deployed().then(function(instance) {
            instance.ShareID({}, { fromBlock: 'latest', toBlock: 'latest'}).watch(function(error, event) {
                if (!error) {
                    // move game state to instance.GameStates.WAITING if the second argument of the event is our address
                    if(event.args._to === web3.eth.accounts[0]) {
                        currGameID = event.args._gameID.c[0];
                        currGameState = 0;
                        areWeHost = true;
                        console.log("GameID is: " + event.args._gameID.c[0]);
                        console.log("Game state is now: " + currGameState);
                        // also disable new game, join game and gameID input
                        UIcontrolFunctions.joinedGameUIState();
                    }
                    console.log(event);
                    console.log("Current account is " + web3.eth.accounts[0] + " logic test is " + (event.args._to === web3.eth.accounts[0]));
                    console.log("Current game ID is " + currGameID + " logic test is " + (event.args._gameID.c[0] === currGameID));
                } else {
                    console.error('Error:', error);
                }
            });
            instance.AcceptingBoards({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // in this state we enable the player's board if and only if the argument is the player's address and the gameID is the one we're currently playing
                    if(event.args._gameID.c[0] === currGameID) {
                        UIcontrolFunctions.placingShipsUIState();
                        currGameState = 1;
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.GameStart({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                    // allow player to propose a stake
                    currGameState = 2;
                    UIcontrolFunctions.settingStakeUIState();
                } else {
                    console.error('Error:', error);
                }
            });
            instance.SuggestedStake({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                    // ask player if this stake is okay if they're not the sender of this message
                    if(event.args._from !== web3.eth.accounts[0]) {
                        // notify player of the stake proposal, do this via popup box
                        popoutMessage = "Opponent suggests a stake of " + event.args._stakeValue.c[0] + " WEI.";
                        UIcontrolFunctions.createPopout("Stake proposal", popoutMessage, App.proposeStake, null, event.args._stakeValue.c[0], true);
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.GamePayable({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                    // move game state to 3
                    currGameState = 3;
                    // notify player they can pay the agreed stake, do this via popup box                    
                    UIcontrolFunctions.createPopout("Stake payable", "The stake is set to " + event.args._stakeValue + ". Pay?", App.payStake, App.declineStake, event.args._stakeValue, true);
                } else {
                    console.error('Error:', error);
                }
            });
            instance.StakePaid({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                    // check if we are the _whoPaid of this message
                    if(event.args._whoPaid === web3.eth.accounts[0]) {
                        // wait on the other player to pay the stake, signaled by the PlayerZeroTurn event
                        // enable the call foul button
                        UIcontrolFunctions.enableDeclareFoulButton();
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.BoardAcknowledgeEvent({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                    // disable the place submit board button if we are the target of this message
                    if(event.args._player === web3.eth.accounts[0]) {
                        UIcontrolFunctions.disableSubmitBoardButton();
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.PlayerZeroTurn({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // console.log(event);
                    // set state to P0_FIRING
                    currGameState = 4;
                    UIcontrolFunctions.enableGrid(grid2);
                    UIcontrolFunctions.p0FiringUIState();
                    // time to register the event handler for clicking on an opponent's tile
                    var opponentGrid = document.getElementById("opponent-grid");
                    for(var i = 0; i < opponentGrid.children.length; i++) {
                        // ignore the first row and column, as they are labels
                        if(i % 9 === 0 || i < 9) {
                            continue;
                        }
                        opponentGrid.children[i].addEventListener("click", App.opponentGridClick);
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.ShotsFired({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // if we are not the _from of this event, we need to check and respond to the shot
                    if(event.args._from !== web3.eth.accounts[0] && event.args._gameID.c[0] === currGameID) {
                        if(areWeHost){
                            UIcontrolFunctions.p0CheckingUIState();
                            currGameState = 7; // P0_CHECKING
                        }
                        else {
                            UIcontrolFunctions.p1CheckingUIState();
                            currGameState = 5; // P1_CHECKING
                        }
                        // reply to the contract with the result of the shot
                        // also update the relative tile on our board 
                        UIcontrolFunctions.updateTile(grid1, event.args._location.c[0], ships[event.args._location.c[0]]);
                        var target = event.args._location.c[0];
                        var targetNode = MerkleHelperFunctions.leafNodes[target];
                        App.contracts.Battleships.deployed().then(function(instance) {
                            battleshipsInstance = instance;
                            return battleshipsInstance.ConfirmShot(currGameID, event.args._location, ships[target], targetNode, MerkleHelperFunctions.computedTree.getHexProof(targetNode), {from: web3.eth.accounts[0]});
                        })
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.ShotsChecked({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // if we are not the _from of this event, we need to update our board!
                    if(event.args._from !== web3.eth.accounts[0] && event.args._gameID.c[0] === currGameID && event.args._validiy) {
                        if(areWeHost){
                            UIcontrolFunctions.p0FiringUIState();
                            currGameState = 4; // P0_FIRING
                        } else {
                            UIcontrolFunctions.p1FiringUIState();
                            currGameState = 6; // P1_FIRING
                        }
                        // update the relative tile on the opponent's board
                        UIcontrolFunctions.updateTile(grid2, event.args._location.c[0], event.args._isHit);
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.RequestBoard({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    if(event.args._from !== web3.eth.accounts[0] && event.args._gameID.c[0] === currGameID){
                        // we need to push all our nodes and proofs to the contract.
                        let tiles = [];
                        let proofs = [];
                        MerkleHelperFunctions.board.forEach(element => {
                            tiles.push(element.tile);
                        });
                        MerkleHelperFunctions.leafNodes.forEach(element => {
                            proofs.push(computedTree.getHexProof(element))
                        });
                        App.contracts.Battleships.deployed().then(function(instance) {
                            battleshipsInstance = instance;
                            return battleshipsInstance.VerifyWinner(currGameID, tiles, ships, MerkleHelperFunctions.leafNodes, proofs, MerkleHelperFunctions.board_root, {from: web3.eth.accounts[0]});
                        });
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.Victory({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // if we are the _winner of this event, we need to claim our winnings, enable the corresponding button
                    if(event.args._winner === web3.eth.accounts[0] && currGameID === event.args._gameID.c[0]) {
                        // show a popup box notifying the user of their victory
                        // we could also 
                        UIcontrolFunctions.createPopout("Victory!", "You have won the game. You can now claim your winnings.", null, null, null, false);
                        // we could also have the claim winnings function embedded in the accept button of the popup box.
                        UIcontrolFunctions.enableClaimWinningsButton();
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.Foul({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // if we are the _accused of this event, show a popup
                    if(event.args._accused === web3.eth.accounts[0] && currGameID === event.args._gameID.c[0]) {
                        UIcontrolFunctions.createPopout("Foul declared", "Your opponent has declared a foul. You have 5 blocks to respond starting from block " + event.args._block.c[0] + ".", null, null, null, false);
                    }
                } else {
                    console.error('Error:', error);
                }
            });
            instance.GameEnded({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function(error, event) {
                if(!error) {
                    // reset the game state to 0
                    currGameState = 0;
                    // restore UI to starting state
                    UIcontrolFunctions.initialGameUIState();
                    stateControlFunctions.resetBoard();
                    stateControlFunctions.resetGlobals();
                    // notify the user via popup box
                    UIcontrolFunctions.createPopout("Game ended", "The game has ended. You can now start a new game.", null, null, null, false);
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
            })
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
                // we need to deal with the event right away for the joiner, as otherwise they wouldn't know their gameID
                // set currGameID to the gameID we just joined
                currGameID = parseInt(result.logs[0].args._gameID.c[0]);
                console.log("You joined game " + currGameID);
                // also disable new game, join game and gameID input
                UIcontrolFunctions.joinedGameUIState();
                return;
            }).catch(function(err) {
                console.log(err.message);
            });
        });
    },

    submitBoard: function() {
        // convert the grid to a merkle trie
        MerkleHelperFunctions.generatePlayerBoard(ships);
        // call the placeShips function in the contract
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.placeShips(gameID, MerkleHelperFunctions.board_root, {from: account});
            })
        });
    },

    playerGridClick: function(event) {
        var index = event.target.dataset.index;
        console.log("Your grid " + Number(index));
    },

    opponentGridClick: function(event) {
        var index = event.target.dataset.index;
        console.log("Opponent's grid " + Number(index));
        // call fireTorpedo function in contract
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.fireTorpedo(gameID, index, {from: account});
            })
        });
    },

    proposeStake: function(stakeValue) {
        // call the proposeStake function in the contract
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.proposeStake(gameID, stakeValue, {from: account});
            })
        });
    },

    payStake: function(stakeValue) {
        // call the payStake function in the contract
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.payStake(gameID, {from: account, value: stakeValue});
            })
        });
    },

    declineStake: function() {
        // call the declineStake function in the contract
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.declineStake(gameID, {from: account});
            })
        });
    },

    withdrawWinnings: function() {
        // call the withdrawWinnings function in the contract
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.withdrawWinnings(gameID, {from: account});
            })
        });
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    });
});
