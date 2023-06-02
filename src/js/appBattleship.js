App = {
    web3Provider: null,
    contracts: {},
    currentBlockNumber: 0,
    initialBlockNumber: 0,
    account: 0x0,
    // global variable to store the id of our currently joined game
    currGameID: 0,
    areWeHost: false,
    ships_placed: 0, // global variable to keep track of the number of ships placed
    currGameState: 0, // global variable to keep track of the current game state as described in the contract
    // global boolean array to keep track of the player's placed ships, 64 positions, initially all false
    ships: new Array(64).fill(false),
    // global boolean array to keep track of the player's hits, 64 positions, initially all false
    hits: new Array(64).fill(false),
    grid1: document.getElementById("your-grid"),
    grid2: document.getElementById("opponent-grid"),
    // remainder from when we had a reset board button
    stateControlFunctions: {
        resetBoard: function() {
            // Set every tile on both boards its default state and make them clickable again
            // as this can only be used before a game has started, it won't ever reset the opponent's board
            var tiles = document.querySelectorAll(".tile");
            for (var i = 0; i < tiles.length; i++) {
                tiles[i].style.pointerEvents = "auto";
                tiles[i].innerHTML = "";
                tiles[i].style = getComputedStyle(tiles[i]);
                tiles[i].enabled = true;
            }
            // reset the global variables
            App.ships_placed = 0;
            App.ships = new Array(64).fill(false);
        },

        resetGlobals: function() {
            // reset the global variables
            App.ships_placed = 0;
            App.ships = new Array(64).fill(false);
            App.hits = new Array(64).fill(false);
            App.currGameID = 0;
            App.areWeHost = false;
            App.currGameState = 0;
            App.MerkleHelperFunctions.board = [];
            App.MerkleHelperFunctions.leafNodes = [];
            App.MerkleHelperFunctions.computedTree = null;
            App.MerkleHelperFunctions.board_root = 0x0;
        }
    },

    MerkleHelperFunctions: {
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
                console.log("Pushing element: " + board_elem.tile + " " + board_elem.ship);
                App.MerkleHelperFunctions.board.push(board_elem);
            }
            App.MerkleHelperFunctions.leafNodes = this.board.map((_board) => 
                App.MerkleHelperFunctions.encodeNode(_board.tile,_board.ship)
            );
            App.MerkleHelperFunctions.computedTree = new MerkleTree(App.MerkleHelperFunctions.leafNodes, keccak256, {sortPairs: true});
            App.MerkleHelperFunctions.board_root = App.MerkleHelperFunctions.computedTree.getHexRoot();
        },
        encodeNode: function(tile, ship){
            const tmpVal = web3.utils.keccak256(web3.eth.abi.encodeParameters(['uint8','bool'],[tile,ship]));
            console.log("Computed hash in hex as a string: " + tmpVal + " of len " + (tmpVal.length -2))
            return tmpVal;
        }
    },

    UIcontrolFunctions: {

        printGameState: function() {
            console.log("Ships placed: " + App.ships_placed);
            console.log("Ships: " + App.ships);
            console.log("Hits: " + App.hits);
            console.log("App.currGameID: " + App.currGameID);
            console.log("App.currGameState: " + App.currGameState);
            console.log("Our address: " + App.account);
            if(App.currGameState >= 2){
                console.log("Ships:" + App.ships);
                console.log("Leaf nodes: " + App.MerkleHelperFunctions.leafNodes);
                proofs = [];
                App.MerkleHelperFunctions.leafNodes.forEach(element => {
                    proofs.push([App.MerkleHelperFunctions.computedTree.getHexProof(element)])
                });
                console.log("Proofs: ");
                proofs.forEach(element => {
                    console.log(element);
                });
            }
        },

        createDebugButton: function() {
            // debug button
            printGameStateButton = document.getElementById("print-game-state-btn");
            printGameStateButton.addEventListener("click", App.UIcontrolFunctions.printGameState);
            // and its associated function
            
        },

        populateGrids: function(element) {
            // Create the first grid dynamically
            // get the html element 'your-grid' by id and assign it to a variable
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
                        tile.addEventListener("click", App.handleClick);
                    }
                    element.appendChild(tile);
                }
            }
        },

        disableGrid: function(element) {
            element.style.filter = "blur(5px)";
            element.style.pointerEvents = "none";    
        },

        // create functions to enable and disable each component of the app

        enableAbandonGameButton: function() {
            var abandonGameButton = document.getElementById("abandon-game-btn");
            abandonGameButton.disabled = false;
        },

        disableAbandonGameButton: function() {
            var abandonGameButton = document.getElementById("abandon-game-btn");
            abandonGameButton.disabled = true;
        },

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

        enableVerifyVictoryButton: function() {
            var claimWinningsButton = document.getElementById("verify-victory-btn");
            claimWinningsButton.disabled = false;
        },

        disableVerifyVictoryButton: function() {
            var claimWinningsButton = document.getElementById("verify-victory-btn");
            claimWinningsButton.disabled = true;
        },

        enableDeclareFoulButton: function() {
            var declareFoulButton = document.getElementById("declare-foul-btn");
            var verifyFoulButton = document.getElementById("verify-foul-btn");
            declareFoulButton.disabled = false;
            verifyFoulButton.disabled = false;
        },

        disableDeclareFoulButton: function() {
            var declareFoulButton = document.getElementById("declare-foul-btn");
            var verifyFoulButton = document.getElementById("verify-foul-btn");
            declareFoulButton.disabled = true;
            verifyFoulButton.disabled = true;
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
            App.UIcontrolFunctions.disableAbandonGameButton();
            App.UIcontrolFunctions.disableGrid(App.grid1);
            App.UIcontrolFunctions.disableGrid(App.grid2);
            App.UIcontrolFunctions.disableSubmitBoardButton();
            App.UIcontrolFunctions.disableClaimWinningsButton();
            App.UIcontrolFunctions.disableDeclareFoulButton();
            App.UIcontrolFunctions.disableProposeStakeButton();
            App.UIcontrolFunctions.disableStakeInput();
            App.UIcontrolFunctions.enableNewGameButtons();
            App.UIcontrolFunctions.enableJoinGameButton();
            App.UIcontrolFunctions.enableGameIDInput();
            App.UIcontrolFunctions.disableVerifyVictoryButton();
        },

        joinedGameUIState: function() {
            // obscure all join/new game buttons and the gameID input
            App.UIcontrolFunctions.disableJoinGameButton();
            App.UIcontrolFunctions.disableGameIDInput();
            App.UIcontrolFunctions.disableNewGameButtons();
            App.UIcontrolFunctions.enableAbandonGameButton();
            // set the placeholder text of gameID input to the gameID we just joined
            var gameIDInputField = document.getElementById("game-id-input");
            gameIDInputField.value = App.currGameID;
        },

        placingShipsUIState: function() {
            App.UIcontrolFunctions.enableGrid(App.grid1);
            // the activation of the submit board button is dealt with in the event listener for board tiles, as it's tied to the number of ships placed
        },

        settingStakeUIState: function() {
            App.UIcontrolFunctions.lockGrid(App.grid1);
            App.UIcontrolFunctions.enableProposeStakeButton();
            App.UIcontrolFunctions.enableStakeInput();
        },

        acceptingPaymentUIState: function() {
            App.UIcontrolFunctions.disableProposeStakeButton();
            App.UIcontrolFunctions.disableStakeInput();
            // the actual payment is processed in the accept button of the popup box which appears when the stake is set, in the event listener for the GamePayable event
            // ergo no "pay stake" button has to be enabled, or even exist
        },

        // we get to the main game loop, here all buttons 
        p0FiringUIState: function() {
            App.UIcontrolFunctions.disableProposeStakeButton();
            App.UIcontrolFunctions.disableStakeInput();
            App.UIcontrolFunctions.disableSubmitBoardButton();
            // player zero can click the grid, player one can't
            // this is effectively pointless as the contract already enforces the state machine, but we like it neat
            if(!App.areWeHost) {
                App.UIcontrolFunctions.lockGrid(App.grid2);
                console.log("P0 firing is locking grid2 for p1.")
            } else{
                App.UIcontrolFunctions.unlockGrid(App.grid2);
                console.log("P0 firing is unlocking grid2 for p0.")
            }
        },

        p1FiringUIState: function() {
            if(App.areWeHost) {
                App.UIcontrolFunctions.lockGrid(App.grid2);
                console.log("P1 firing is locking grid2 for p0.")
            } else{
                App.UIcontrolFunctions.unlockGrid(App.grid2);
                console.log("P1 firing is unlocking grid2 for p1.")
            }
        },

        // nothing actually happens here yet, but we might want to add a "waiting for opponent" message
        // the involved user won't have to manually input anything if using THIS client.
        p0CheckingUIState: function() {
        },

        p1CheckingUIState: function() {
        },

        updateShotFiredTile: function(index) {
            grid = document.getElementById("opponent-grid");
            tile = grid.querySelector(`[data-index="${index}"]`);
            tile.style.backgroundColor = 'yellow';
            tile.innerHTML = '?';
            tile.style.fontWeight = 'bold';
            tile.style.color = 'black';
            tile.verticalAlign = 'middle';
            tile.style.textAlign = 'center';
            tile.style.fontSize = '30px';
            // disable the tile so it can't be clicked again
            tile.style.pointerEvents = "none";
        },

        updateTile: function(grid, index, isHit) {
            grid = document.getElementById(grid.id);
            tile = grid.querySelector(`[data-index="${index}"]`);
            if(isHit){
                tile.style.backgroundColor = 'red';
                tile.innerHTML = 'X';
                App.hits[index] = true;
            } else {
                tile.style.backgroundColor = getComputedStyle(tile).getPropertyValue('background-color');
                tile.innerHTML = 'O';
            }
            tile.style.fontWeight = 'bold';
            tile.style.color = 'black';
            tile.verticalAlign = 'middle';
            tile.style.textAlign = 'center';
            tile.style.fontSize = '30px';
        },        

        // this is mostly used during the phases of the game concerning the stake, we register callbacks which tie into the contract to confirm or refuse payments
        createPopout: function(Title, Message, AcceptActionCallback, RefuseActionCallback, args, showCancel) {
            // notify player of the stake proposal, do this via popup box
            var modal = document.getElementById("myModal");
            var old_acceptBtn = document.getElementById("acceptBtn");
            var old_refuseBtn = document.getElementById("refuseBtn");
            var title = document.getElementById("modal-title");
            var message = document.getElementById("modal-message");
            // set the title and message of the popup box
            title.innerHTML = Title;
            message.innerHTML = Message;
            modal.style.display = "flex";
            if(!showCancel) {
                old_refuseBtn.style.display = "none";
            } else {
                old_refuseBtn.style.display = "flex";
            }
            // reset all event listeners on the buttons
            var acceptBtn = old_acceptBtn.cloneNode(true);
            var refuseBtn = old_refuseBtn.cloneNode(true);
            old_acceptBtn.parentNode.replaceChild(acceptBtn, old_acceptBtn);
            old_refuseBtn.parentNode.replaceChild(refuseBtn, old_refuseBtn);
            // install the new ones
            acceptBtn.addEventListener("click", function() {
                // Add your code here for the accept action
                console.log("User clicked Accept");
                closeModal();
                return true;
            });
            if(AcceptActionCallback != null){
            acceptBtn.addEventListener("click", function() {
                    AcceptActionCallback(args);
            });}
            refuseBtn.addEventListener("click", function() {
                // Add your code here for the refuse action
                console.log("User clicked Refuse");
                closeModal();
                return false;
            });
            if(RefuseActionCallback != null){
                refuseBtn.addEventListener("click", function() {
                    RefuseActionCallback(args);
            });}
            function closeModal() {
                modal.style.display = "none";
            }
            window.addEventListener("click", function(event) {
                if (event.target == modal) {
                    event.preventDefault(); // Prevent closing the modal by clicking outside
                }
            });
        },
    },

    handleClick(event) {
        var grid = event.target.closest('.grid');
        var index = event.target.dataset.index;
        if (grid.id === "your-grid") {
            // if this is the player's grid we are placing a ship or removing an already placed ship
            // there's a limit of 20 ships which can be placed, disable the grid once this limit is reached
            if(App.ships[index]) {
                // if the tile is already occupied by a ship, remove it
                event.target.style = getComputedStyle(event.target);
                App.ships[index] = false;
                App.ships_placed--;
            } else if (!App.ships[index] && App.ships_placed < 20) {
                event.target.style.backgroundColor = "grey";
                // this is an array storing the value of each tile in the grid which we will use to generate the merkle trie
                App.ships[index] = true;
                App.ships_placed++;
            }
            if (App.ships_placed === 20) {
            App.UIcontrolFunctions.enableSubmitBoardButton();
            } else {
                App.UIcontrolFunctions.disableSubmitBoardButton();
            }
        } 
    },

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
                App.currentBlockNumber = result;
                App.initialBlockNumber = App.currentBlockNumber;
                console.log("Initial block number: " + result);
            } else {
                console.error('Error:', error);
            }
        });
        await web3.eth.getAccounts(function(error, result) {
            if (!error) {
                App.account = result[0];
                console.log("Account: " + result[0]);
            } else {
                console.error('Error:', error);
            }
        });

        return App.initContract();
    },

    updateBlockNumber: async function() {
        await web3.eth.getBlockNumber(function(error, result) {
            if (!error) {
                App.currentBlockNumber = result;
                console.log("Current block number: " + result);
            } else {
                console.error('Error:', error);
            }
        });
        return App.currentBlockNumber;
    },

    initContract: function() {
        return new Promise(function(resolve, reject) {
            $.getJSON('Battleships.json', function(data) {
                // Get the necessary contract artifact file and instantiate it with @truffle/contract
                var BattleshipsArtifact = data;
                App.contracts.Battleships = TruffleContract(BattleshipsArtifact);

                // Set the provider for our contract
                App.contracts.Battleships.setProvider(App.web3Provider);
                App.contracts.Battleships.abi = BattleshipsArtifact.abi;

                resolve();
            }).fail(function(error) {
                reject(error);
            });
        });
    },

    // debug function to echo a 2d array of bytes32
    echoBoard: function() {
        var battleshipsInstance;
        board = [[App.MerkleHelperFunctions.encodeNode('53', true),App.MerkleHelperFunctions.encodeNode('54', true)],[App.MerkleHelperFunctions.encodeNode('53', true),App.MerkleHelperFunctions.encodeNode('54', true)]];
        console.log(board);
        App.contracts.Battleships.deployed().then(function(instance) {
            battleshipsInstance = instance;
            return battleshipsInstance.echo2dArray(board, {from: App.account});
        }).then(function(retVal) {
            console.log("Server sees "+ retVal);
        });
    },

    // quick debug function to have the node echoed back to us
    echoBytes: function() {
        var battleshipsInstance;
        //var node = App.MerkleHelperFunctions.encodeNode('52', true);
        //console.log("We are about to send the node: " + node + " of length " + node.length);
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.echoNodeBytes(App.MerkleHelperFunctions.encodeNode('52', true), {from: account});
            }).then(function(retVal) {
                console.log("Server sees "+ retVal + " of length " + (retVal.length -2));
            });
        });
    },

    echoBytesInput: function(node) {
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.echoNodeBytes(node, {from: account});
            }).then(function(retVal) {
                console.log("Server sees "+ retVal + " of length " + (retVal.length -2));
            });
        });
    },

    bindEvents: function() {
        // using the same syntax as the example below, create binding for all components of our app
        // we actually register this only once the game has begun
        // $(document).on('click', '#opponent-grid .tile', App.opponentGridClick);
        // this does nothing as of yet, but we might want it around for later
        // $(document).on('click', '#your-grid .tile', App.playerGridClick);
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
        $(document).on('click', '#declare-foul-btn', function() {
            App.declareFoul();
        });
        $(document).on('click', '#propose-stake-btn', function() {
            App.proposeStake();
        });
        $(document).on('click', '#abandon-game-btn', function() {
            App.abandonGame();
        });
        $(document).on('click', '#print-game-state-btn', function() {
            //App.echoBytes();
            App.echoBoard();
        });
        $(document).on('click', '#verify-victory-btn', function() {
            App.verifyVictory();
        });
        $(document).on('click', '#verify-foul-btn', function() {
            App.verifyFoul();
        });
        // Listen for all events emitted by the contract
        App.contracts.Battleships.deployed().then(function(instance) {
            instance.ShareID().on('data', event => {
                // move game state to instance.GameStates.WAITING if the second argument of the event is our address
                if(event.args._to === App.account) {
                    App.currGameID = event.args._gameID.words[0];
                    App.currGameState = 0;
                    App.areWeHost = true;
                    console.log("GameID is: " + event.args._gameID.words[0]);
                    console.log("Game state is now: " + App.currGameState);
                    // also disable new game, join game and gameID input
                    App.UIcontrolFunctions.joinedGameUIState();
                }
                console.log(event);
                console.log("Current account is " + App.account + " logic test is " + (event.args._to === App.account));
                console.log("Current game ID is " + App.currGameID + " logic test is " + (event.args._gameID.words[0] === App.currGameID));
            });
            instance.AcceptingBoards().on('data', event => {
                    // in this state we enable the player's board if and only if the argument is the player's address and the gameID is the one we're currently playing
                    if(event.args._gameID.words[0] === App.currGameID) {
                        console.log("hello from accepting boards inner if");
                        App.currGameState = 1;
                        console.log("Game state is now: " + App.currGameState);
                        App.UIcontrolFunctions.placingShipsUIState();
                    }
            });
            instance.GameStart().on('data', event => {
                if(event.args._gameID.words[0] === App.currGameID) {
                    // console.log(event);
                    // allow player to propose a stake
                    App.currGameState = 2;
                    App.UIcontrolFunctions.settingStakeUIState();
                }
            });
            instance.SuggestedStake().on('data', event => {
                // console.log(event);
                // ask player if this stake is okay if they're not the sender of this message
                if(event.args._gameID.words[0] === App.currGameID && event.args._to === App.account) {
                    // notify player of the stake proposal, do this via popup box
                    stakeValue = event.args._stakeValue.words[0];
                    popoutMessage = "Opponent suggests a stake of " + stakeValue + " WEI.";
                    App.UIcontrolFunctions.createPopout("Stake proposal", popoutMessage, App.proposeStake, null, stakeValue, true);
                }
            });
            instance.GamePayable().on('data', event => {
                if(event.args._gameID.words[0] === App.currGameID) {
                    // console.log(event);
                    // move game state to 3
                    App.currGameState = 3;
                    // notify player they can pay the agreed stake, do this via popup box     
                    stakeValue = event.args._stakeValue.words[0];
                    App.UIcontrolFunctions.disableProposeStakeButton();         
                    App.UIcontrolFunctions.createPopout("Stake payable", "The stake is set to " + stakeValue + ". Pay?", App.payStake, App.declineStake, stakeValue, true);
                }
            });
            instance.StakePaid().on('data', event => {
                // console.log(event);
                // check if we are the _whoPaid of this message
                if(event.args._gameID.words[0] === App.currGameID && event.args._whoPaid === App.account) {
                    // wait on the other player to pay the stake, signaled by the PlayerZeroTurn event
                    // enable the call foul button
                    App.UIcontrolFunctions.enableDeclareFoulButton();
                }
            });
            instance.BoardAcknowledgeEvent().on('data', event => {
                // console.log(event);
                // disable the place submit board button if we are the target of this message
                if(event.args._gameID.words[0] === App.currGameID) {
                    App.UIcontrolFunctions.disableSubmitBoardButton();
                }
            });
            instance.PlayerZeroTurn().on('data', event => {
                // console.log(event);
                // set state to P0_FIRING
                if(event.args._gameID.words[0] === App.currGameID) {
                    App.currGameState = 4;
                    App.UIcontrolFunctions.enableGrid(App.grid2);
                    App.UIcontrolFunctions.p0FiringUIState();
                    // time to register the event handler for clicking on an opponent's tile
                    var opponentGrid = document.getElementById("opponent-grid");
                    for(var i = 0; i < opponentGrid.children.length; i++) {
                        // only add this listener to elements of class '.tile'
                        if(!opponentGrid.children[i].classList.contains("tile-label")) {
                            opponentGrid.children[i].addEventListener("click", App.opponentGridClick);
                        }
                    }
                }
            });
            instance.ShotsFired().on('data', event => {
                if(event.args._gameID.words[0] === App.currGameID){
                    // if we are the firing player, change the state to 'opposite_CHECKING'
                    if(event.args._from === App.account){
                        if(App.areWeHost){
                            App.UIcontrolFunctions.p1CheckingUIState();
                            App.currGameState = 5; // P1_CHECKING
                        } else {
                            App.UIcontrolFunctions.p0CheckingUIState();
                            App.currGameState = 7; // P0_CHECKING
                        }
                    } else if(event.args._from !== App.account){
                        // now we analyze the shot and generate proof of it
                        var target = event.args._location.words[0];
                        var targetNode = App.MerkleHelperFunctions.leafNodes[target];
                        var targetNodeProof = App.MerkleHelperFunctions.computedTree.getHexProof(targetNode);
                        // then we call the contract with the result of the shot
                        // IMPORTANT: Due to duplicate events in the ganache log we should NEVER use an event parameter as a function parameter
                        App.contracts.Battleships.deployed().then(function(instance) {
                            instance.ConfirmShot(App.currGameID, target, App.ships[target], targetNode, targetNodeProof, {from: App.account});
                        }).then(function(result) {
                            // refusing this transaction bricks the game
                            // if we are the receiving player, change the state to 'us_CHECKING'
                            App.UIcontrolFunctions.updateTile(App.grid1, target, App.ships[target]);
                            if(App.areWeHost){
                                App.UIcontrolFunctions.p0CheckingUIState();
                                App.currGameState = 7; 
                            } else {
                                App.UIcontrolFunctions.p1CheckingUIState();
                                App.currGameState = 5; 
                            }
                        });
                    }
                }
            });
            instance.ShotsChecked().on('data', event => {
                // if we are not the _from of this event, we need to update our board!
                if(event.args._gameID.words[0] === App.currGameID && event.args._validity) {
                    if(event.args._from !== App.account){
                        // update the relative tile on the opponent's board
                        target = event.args._location.words[0];
                        claim = event.args._claim;
                        App.UIcontrolFunctions.updateTile(App.grid2, target, claim);
                        // if the message wasn't sent by us it means it's our turn to fire
                        if(App.areWeHost){
                            App.UIcontrolFunctions.p1FiringUIState();
                            App.currGameState = 6;
                        } else {
                            App.UIcontrolFunctions.p0FiringUIState();
                            App.currGameState = 4; 
                        }
                    } else {
                        // otherwise it's the opponent's
                        if(App.areWeHost){
                            App.UIcontrolFunctions.p0FiringUIState();
                            App.currGameState = 4; 
                        } else {
                            App.UIcontrolFunctions.p1FiringUIState();
                            App.currGameState = 6; 
                        }
                    }
                }
            });
            instance.RequestBoard().on('data', event => {
                if(event.args._winner === App.account && event.args._gameID.words[0] === App.currGameID){
                    // show user a popup, if they refuse to submit their board, they forfeit the game
                    // otherwise, the submission is automated
                    App.UIcontrolFunctions.createPopout("Board requested", "The contract has declared you winner and must check your board before paying out. Submit?", App.verifyVictory, null, null, true);
                    // also enable the verify victory button just in case they refuse the transaction the first time.
                    App.UIcontrolFunctions.enableVerifyVictoryButton();
                    // we need to push all our nodes and proofs to the contract.
                }
            });
            instance.Victory().on('data', event => {
                // if we are the _winner of this event, we need to claim our winnings, enable the corresponding button
                if(event.args._winner === App.account && App.currGameID === event.args._gameID.words[0]) {
                    // show a popup box notifying the user of their victory
                    // we could also 
                    App.UIcontrolFunctions.createPopout("Victory!", "You have won the game. You can now claim your winnings.", null, null, null, false);
                    // we could also have the claim winnings function embedded in the accept button of the popup box.
                    App.UIcontrolFunctions.enableClaimWinningsButton();
                }else if(event.args._winner !== App.account && App.currGameID === event.args._gameID.words[0]) {
                    // show a popup box notifying the user of their defeat
                    App.UIcontrolFunctions.createPopout("Defeat!", "You have lost the game. Your opponent is now validating their board. If you don't want to wait for them to do that, you can hit abandon game or reload the page to start a new game, but you might miss out on a potential payout.", null, null, null, false);
                }
            });
            instance.Foul().on('data', event => {
                // if we are the _accused of this event, show a popup
                if(event.args._accused === App.account && App.currGameID === event.args._gameID.words[0]) {
                    block = event.args._block.words[0];
                    App.UIcontrolFunctions.createPopout("Foul declared", "Your opponent has declared a foul. You have 5 blocks to respond starting from block " + block + ".", null, null, null, false);
                }
            });
            instance.GameEnded().on('data', event => {
                if(event.args._gameID.words[0] === App.currGameID) {
                    // restore UI to starting state
                    App.UIcontrolFunctions.initialGameUIState();
                    App.stateControlFunctions.resetBoard();
                    App.stateControlFunctions.resetGlobals();
                    // notify the user via popup box
                    App.UIcontrolFunctions.createPopout("Game ended", "The game has ended. You can now start a new game.", null, null, null, false);
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
            console.log(account);
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
                // set App.currGameID to the gameID we just joined
                App.currGameID = parseInt(result.logs[0].args._gameID.words[0]);
                console.log("You joined game " + App.currGameID);
                // also disable new game, join game and gameID input
                App.UIcontrolFunctions.joinedGameUIState();
                return;
            }).catch(function(err) {
                console.log(err.message);
            });
        });
    },

    submitBoard: function() {
        // convert the grid to a merkle trie
        App.MerkleHelperFunctions.generatePlayerBoard(App.ships);
        // call the placeShips function in the contract
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.PlaceShips(App.currGameID, App.MerkleHelperFunctions.board_root, {from: account});
            }).then(function(result) {
                // disable the player's grid
                // in theory this happens in boardacknowledgeevent
                console.log("Submitted board with root " + App.MerkleHelperFunctions.board_root);
                App.UIcontrolFunctions.lockGrid(App.grid1);
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
        // call fireTorpedo function in contract
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            console.log("Firing torpedo towards " + index + " from account " + account + " in game " + App.currGameID + " in state " + App.currGameState);
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.FireTorpedo(App.currGameID, index, {from: account}).then(function(result) {
                    App.UIcontrolFunctions.updateShotFiredTile(index);
                    // disable the grid
                    App.UIcontrolFunctions.lockGrid(App.grid2);
                });
            })
        });
    },

    proposeStake: function(stakeValue) {
        // call the proposeStake function in the contract
        if(stakeValue === undefined) {
            stakeValue = parseInt(document.getElementById("stake-value-input").value);
        }
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.proposeStake(App.currGameID, stakeValue, {from: account});
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
                return battleshipsInstance.payStake(App.currGameID, {from: account, value: stakeValue});
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
                return battleshipsInstance.declineStake(App.currGameID, {from: account});
            })
        });
    },

    verifyVictory: function() {
        let tiles = [];
        let proofs = [];
        App.MerkleHelperFunctions.board.forEach(element => {
            tiles.push(element.tile);
        });
        App.MerkleHelperFunctions.leafNodes.forEach(element => {
            proofs.push(App.MerkleHelperFunctions.computedTree.getHexProof(element))
        });
        App.contracts.Battleships.deployed().then(function(instance) {
            battleshipsInstance = instance;
            return battleshipsInstance.VerifyWinner(App.currGameID, tiles, App.ships, App.MerkleHelperFunctions.leafNodes, proofs, App.MerkleHelperFunctions.board_root, {from: App.account});
        }).then(function(retVal) {
            App.UIcontrolFunctions.disableVerifyVictoryButton();
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
                return battleshipsInstance.WithdrawWinnings(App.currGameID, {from: account});
            })
        });
    },

    declareFoul: function() {
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.FoulAccusation(App.currGameID, {from: account});
            })
        });
    },

    verifyFoul: function() {
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.CheckFoulTimer(App.currGameID, {from: account});
            })
        });
    },

    abandonGame: function() {
        // create a popup asking for confirmation
        App.UIcontrolFunctions.createPopout("Abandon game", "Are you sure you want to abandon this game?", App.abandonHelper, null, null, true);
    },

    abandonHelper: function() {
        var battleshipsInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.Battleships.deployed().then(function(instance) {
                battleshipsInstance = instance;
                return battleshipsInstance.AbandonGame(App.currGameID, {from: account});
            }).then(function(result) {
                App.UIcontrolFunctions.initialGameUIState();
                App.stateControlFunctions.resetBoard();
                App.stateControlFunctions.resetGlobals();
            });
        });
    }
};

$(function() {
    $(window).load(function() {
        App.init();
        App.UIcontrolFunctions.populateGrids(App.grid1);
        App.UIcontrolFunctions.populateGrids(App.grid2);
        App.UIcontrolFunctions.createDebugButton();
        App.UIcontrolFunctions.initialGameUIState();
        App.stateControlFunctions.resetGlobals();
    });
});
