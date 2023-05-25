// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Battleships {
    uint8 public constant NUMBER_OF_SHIP_SQUARES = 20;
    uint8 public constant BOARD_SIZE = 8;
    enum GameStates{
        WAITING, 
        SETTING_STAKE, 
        ACCEPTING_PAYMENT,
        PLACING_SHIPS, 
        P0_FIRING,
        P1_CHECKING,
        P1_FIRING,
        P0_CHECKING,
        CHECKING_WINNER,
        PAYABLE,
        DONE,
        NONE
    }

    // In this struct we save the view a player has of its opponent's board
    struct Board{
        bool valid;
        // N*N matrix of bits to store hits
        // bool[BOARD_SIZE][BOARD_SIZE] shots;
        // # of enemy pieces still left on the board
        // goes down by one each time we receive one 'you hit' event
        uint totalPieces;
        // 8*8, we use this to avoid cheating
        uint totalShots;
        bool[BOARD_SIZE*BOARD_SIZE] board; 
    }

    struct Player{
        bool valid;
        bool hasPaidStake;
        address playerAddress;
        uint proposedStake;
        bytes32 boardTreeRoot;
        Board shots_board;
    }

    struct Game{
        bool valid;
        bool canPay;
        // host is always player[0]
        Player[2] players;
        GameStates state;
        uint decidedStake;
        // used for foul accusation, a foul is triggered after 5 blocks
        uint blockNumber;
        // player 0 or player 1
        // might turn it into address, we will see
        address accuser;
        // whether or not this game should be in the public pool of joinable games
        bool privateGame;
        address winner;
    }

    mapping(uint => Game) private openGames;

    Game private gameTrampoline;
    Player private playerTrampoline;
    Board private trampolineBoard;
    // used in generating UUIDs for the games
    // for now we are gonna use this as-is
    // start at 1 as 0 is used for a non-existing game
    // TODO: deal with it overflowing
    uint private gameCounter;
    uint private lastOpenGame;
    uint8 private foulBlockLen;
    address private owner;

    constructor() {
        gameCounter = 1;
        lastOpenGame = 1;
        owner = msg.sender;
        // this could be passed as parameter
        foulBlockLen = 5;
    }

    event ShareID(address _from, address _to, uint _gameID);
    event GameStart(uint _gameID, address _host, address _challenger);
    event SuggestedStake(uint _gameID, address _from, address _to, uint _stakeValue);
    event GamePayable(uint _gameID, address _host, address _challenger, uint _stakeValue);
    event StakePaid(uint _gameID, address _whoPaid);
    event AcceptingBoards(uint _gameID);
    event BoardAcknowledgeEvent(uint _gameID, address _player);
    event PlayerZeroTurn(uint _gameID);
    event ShotsFired(uint _gameID, uint8 _location);
    event ShotsChecked(uint _gameID, uint8 _location, bool _claim, bool _validity);
    event RequestBoard(uint _gameID, address _winner);
    event Victory(uint _gameID, address _winner);
    event Foul(uint _gameID, address _accused, uint _block);

    error InvalidGameID();
    error NotInGame();
    error StakeAlreadyDeposited();
    error WrongStakeAmount(uint expectedStakeValue);

    modifier gameExists(uint gameID){
        assert(openGames[gameID].valid);
        _;
    }

    modifier isInGame(uint gameID){
        assert((openGames[gameID].players[0].playerAddress == msg.sender) || (openGames[gameID].players[1].playerAddress == msg.sender));
        _;
    }

    modifier assertState(uint gameID, GameStates _state){
        if(_state != GameStates.P0_FIRING && _state != GameStates.P1_FIRING && _state != GameStates.P0_CHECKING && _state != GameStates.P1_CHECKING)
            assert(openGames[gameID].state == _state);
        else{
            // We check firing states with P0_FIRING and checking states with P0_CHECKING, for both players
            uint[2] memory indexes = getIndexSender(gameID);
            if(_state == GameStates.P0_FIRING){
                if(indexes[0] == 0)
                    assert(openGames[gameID].state == _state);
                else
                    assert(openGames[gameID].state == GameStates.P1_FIRING);
            }
            else if(_state == GameStates.P0_CHECKING){
                if(indexes[0] == 0)
                    assert(openGames[gameID].state == _state);
                else
                    assert(openGames[gameID].state == GameStates.P1_CHECKING);
            }
            else assert(false);
        }
        _;
    }

    modifier playerInRange(uint gameID, uint index){
        assert(openGames[gameID].players[index].valid);
        assert(index < openGames[gameID].players.length);
        _;
    }

    modifier shotOnBoard(uint8 location){
        assert(location < (BOARD_SIZE*BOARD_SIZE));
        _;
    }

    modifier isWinner(uint gameID){
        assert(openGames[gameID].winner == msg.sender);
        _;
    }

    function getIndexSender (uint gameID) view private returns(uint[2] memory) {
        // indexes[0]: msg.sender index
        // indexes[1]: msg.sender opponent's index
        uint[2] memory indexes;
        if(msg.sender == openGames[gameID].players[0].playerAddress){
            indexes[0] = 0;
            indexes[1] = 1;
        } else {
            indexes[0] = 1;
            indexes[1] = 0;
        }
        return indexes;
    }

    // Code from OpenZeppelin's project
    // https://github.com/OpenZeppelin
    function verifyCalldata(
    bytes32[] calldata proof,
    bytes32 root,
    bytes32 leaf
    ) internal pure returns (bool) {
        return processProofCalldata(proof, leaf) == root;
    }

    function processProofCalldata(
        bytes32[] calldata proof,
        bytes32 leaf
    ) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = _hashPair(computedHash, proof[i]);
        }
        return computedHash;
    }

    function _hashPair(bytes32 a, bytes32 b)
        private
        pure
        returns(bytes32)
    {
        return a < b ? _efficientHash(a, b) : _efficientHash(b, a);
    }

    function _efficientHash(bytes32 a, bytes32 b)
        private
        pure
        returns (bytes32 value)
    {
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }
    // end of OpenZeppelin code

    // create a Game value, add it to openGames, populate the Player[0]
    function newGame(bool isPrivate) public {
        uint gameID = gameCounter;
        gameCounter++;
        Game storage game = gameTrampoline;
        Player storage host = playerTrampoline;
        host.playerAddress = msg.sender;
        host.valid = true;
        host.hasPaidStake = false;
        game.players[0] = host;
        game.state = GameStates.WAITING;
        game.privateGame = isPrivate;
        game.valid = true;
        game.canPay = false;
        openGames[gameID] = game;
        emit ShareID(address(this), msg.sender, gameID);
        return;
    }
    
    function joinGame(uint gameID) public {
        if(gameID == 0){
            // pick an unassigned game in sequential order
            gameID = lastOpenGame;
            while(gameID <= gameCounter){
                // ignore games with sender as host (you can still join your own games directly if you're that lonely)
                if(openGames[gameID].valid == true && 
                    openGames[gameID].state == GameStates.WAITING && 
                    openGames[gameID].players[0].playerAddress != msg.sender && 
                    !openGames[gameID].privateGame){
                    break;
                }
                gameID++;
            }
            // update the lastOpenGame counter no matter what
            lastOpenGame = gameID;
        }
        // if the game wasn't valid, throw an error
        assert(openGames[gameID].valid);
        // set msg sender as this game's player 2
        Player storage challenger = playerTrampoline;
        challenger.playerAddress = msg.sender;
        challenger.valid = true;
        challenger.hasPaidStake = false;
        openGames[gameID].players[1] = challenger;
        // update this game's status
        openGames[gameID].state = GameStates.PLACING_SHIPS;
        // alert the players
        emit AcceptingBoards(gameID);
        return;
    }

    function checkGameState(uint gameID) public view returns (GameStates) {
        if (openGames[gameID].valid){
            return openGames[gameID].state;
        }
        else 
            return(GameStates.NONE);
    }

    function checkGamePlayer(uint gameID, uint index) public view returns (address) {
        if (openGames[gameID].valid && openGames[gameID].players[index].valid){
            return openGames[gameID].players[index].playerAddress;
        }
        else 
            return(address(0));
    }

    // Function to propose and agree upon a stake between players
    function proposeStake(uint gameID, uint stakeValue) gameExists(gameID) isInGame(gameID) assertState(gameID, GameStates.SETTING_STAKE) public{
        Game memory game = openGames[gameID];
        // Check whether or not this player's opponent has already proposed a stake
        uint opponentIndex;
        uint stakerIndex;
        if(msg.sender == game.players[0].playerAddress){
            opponentIndex = 1;
            stakerIndex = 0;
        } else {
            opponentIndex = 0;
            stakerIndex = 1;
        }
        uint opponentStake = game.players[opponentIndex].proposedStake;
        // set this player's proposed stake to their message
        openGames[gameID].players[stakerIndex].proposedStake = stakeValue;
        // if the opponent has proposed a stake we check whether or not it equals the one proposed by us
        // 0 is not a valid stake
        if(opponentStake != 0 && opponentStake == stakeValue){
            openGames[gameID].decidedStake = stakeValue;
            openGames[gameID].state = GameStates.ACCEPTING_PAYMENT;
            emit GamePayable(gameID, game.players[0].playerAddress, game.players[1].playerAddress, stakeValue);
        }else{
            emit SuggestedStake(gameID, msg.sender, game.players[opponentIndex].playerAddress, stakeValue);
        }
        return;
    }

    function checkStakePlayerOne(uint gameID) public view returns (uint) {
        if (openGames[gameID].valid && openGames[gameID].players[0].valid){
            return openGames[gameID].players[0].proposedStake;
        }
        else 
            return(0);
    }

    function checkStakePlayerTwo(uint gameID) public view returns (uint) {
        if (openGames[gameID].valid && openGames[gameID].players[1].valid){
            return openGames[gameID].players[1].proposedStake;
        }
        else 
            return(0);
    }

    function checkStakeGame(uint gameID) public view returns (uint) {
        if (openGames[gameID].valid && openGames[gameID].players[0].valid && openGames[gameID].players[1].valid)
            return openGames[gameID].decidedStake;
        else
            return(0);
    }
    
    function payStake(uint gameID) gameExists(gameID) isInGame(gameID) assertState(gameID, GameStates.ACCEPTING_PAYMENT) external payable {
        if((msg.sender == openGames[gameID].players[0].playerAddress && openGames[gameID].players[0].hasPaidStake) ||
            (msg.sender == openGames[gameID].players[1].playerAddress && openGames[gameID].players[1].hasPaidStake))
            revert StakeAlreadyDeposited();
        // only accept payments for the exact amount owed
        if(msg.value != openGames[gameID].decidedStake)
            revert WrongStakeAmount(openGames[gameID].decidedStake);
        // now we check who the sender is
        uint senderIndex;
        uint challengerIndex;
        if(msg.sender == openGames[gameID].players[0].playerAddress){
            senderIndex = 0;
            challengerIndex = 1;
        }else{
            senderIndex = 1;
            challengerIndex = 0;
        }
        openGames[gameID].players[senderIndex].hasPaidStake = true;
        // Clear possible foul
        ClearFoul(gameID);
        emit StakePaid(gameID, msg.sender);
        // if both players have paid the owed stake the game can move on to its next state
        if(openGames[gameID].players[challengerIndex].hasPaidStake){
            openGames[gameID].state = GameStates.P0_FIRING;
            emit PlayerZeroTurn(gameID);
        }
    }
    
    function checkGamePayable(uint gameID) public view returns (bool) {
        if (openGames[gameID].valid && openGames[gameID].players[0].valid && openGames[gameID].players[1].valid)
            return openGames[gameID].canPay;
        else
            return(false);
    }
    
    function PlaceShips(uint gameID, bytes32 boardRoot) gameExists(gameID) isInGame(gameID) assertState(gameID, GameStates.PLACING_SHIPS) public{
        uint index;
        uint oppIdx;
        msg.sender == openGames[gameID].players[0].playerAddress ? index = 0 : index = 1;
        msg.sender == openGames[gameID].players[0].playerAddress ? oppIdx = 1 : oppIdx = 0;
        require(openGames[gameID].players[index].boardTreeRoot == 0x0);
        // Instantiate a new shots board
        // Instantiate the Board struct itself and assign it to a player
        Board storage playerBoard = trampolineBoard;
        trampolineBoard.valid = true;
        trampolineBoard.totalPieces = NUMBER_OF_SHIP_SQUARES;
        trampolineBoard.totalShots = (BOARD_SIZE*BOARD_SIZE);
        for(uint i = 0; i < (BOARD_SIZE*BOARD_SIZE); i++){
            trampolineBoard.board[i] = false;
        }
        openGames[gameID].players[index].shots_board = playerBoard;
        // save the received boardRoot, finally
        openGames[gameID].players[index].boardTreeRoot = boardRoot;
        emit BoardAcknowledgeEvent(gameID, msg.sender);
        if(openGames[gameID].players[oppIdx].boardTreeRoot != 0x0){
            openGames[gameID].state = GameStates.SETTING_STAKE;
            emit GameStart(gameID, openGames[gameID].players[0].playerAddress, msg.sender);
        }
    }

    function TestWinner(uint gameID, address claimant) private {
        openGames[gameID].winner = claimant;
        openGames[gameID].state = GameStates.CHECKING_WINNER;
        RequestWinnerBoard(gameID, openGames[gameID].winner);
    }

    // for info on what location is see "Implementation of the user-side game board" in README.md
    function FireTorpedo(uint gameID, uint8 location) gameExists(gameID) isInGame(gameID) shotOnBoard(location) assertState(gameID, GameStates.P0_FIRING) public {
        // if we got past the modifiers, this means the shot is valid
        // let's clear any potential fouls for this user
        ClearFoul(gameID);
        uint[2] memory indexes = getIndexSender(gameID);
        // Rotate into correct next state
        openGames[gameID].state == GameStates.P0_FIRING ? openGames[gameID].state = GameStates.P1_CHECKING : openGames[gameID].state = GameStates.P0_CHECKING;
        // Now for some game logic
        // whatever happens, we lower the totalShots counter of our system by one
        openGames[gameID].players[indexes[0]].shots_board.totalShots--;
        // Then we evaluate whether or not this is zero. If it is, This party wins automatically.
        // We do this here to avoid opponents stalling out on the reply for 5 blocks on what is a foregone conclusion
        if (openGames[gameID].players[indexes[0]].shots_board.totalShots == 0){
            TestWinner(gameID, msg.sender);
        } else {
            emit ShotsFired(gameID, location);
        }
    }
    /*
     gameExists(gameID) isInGame(gameID) shotOnBoard(location) assertState(gameID, GameStates.P0_CHECKING)
    */
    function ConfirmShot(uint gameID, uint8 location, bool isHit, bytes32 leaf, bytes32[] calldata proof) public {
        // we assert manually rather than with modifiers to avoid a stack-too-deep error
        assert(openGames[gameID].valid);
        assert(location < (BOARD_SIZE*BOARD_SIZE));
        if(openGames[gameID].players[0].playerAddress == msg.sender){
            assert(openGames[gameID].state == GameStates.P0_CHECKING);
        } else if (openGames[gameID].players[1].playerAddress == msg.sender){
            assert(openGames[gameID].state == GameStates.P1_CHECKING);
        } else {
            assert(false);
        }
        uint[2] memory indexes = getIndexSender(gameID);
        // make sure this node corresponds to the board tile and truth value we are checking
        assert(leaf == GenLeafNode(location, isHit));
        // execute the proof test
        if(verifyCalldata(proof, openGames[gameID].players[indexes[0]].boardTreeRoot, leaf)){
            // if we got this far it means the reply is valid
            // let's clear any potential fouls for this user
            ClearFoul(gameID);
            // we could verify this user's proof
            if (isHit){
                // decrement our opponent's view of our total pieces
                // only if the shot landed on a previously undeclared tile
                // alas this is needed as the user might just keep asking for the same time over and over
                // I don't know why they would do this, but they can
                if(!openGames[gameID].players[indexes[1]].shots_board.board[location]){
                    openGames[gameID].players[indexes[1]].shots_board.totalPieces--;
                    openGames[gameID].players[indexes[1]].shots_board.board[location] = true;
                    // if this was our last piece, we lost
                    if(openGames[gameID].players[indexes[1]].shots_board.totalPieces == 0){
                        /*
                        openGames[gameID].winner = openGames[gameID].players[indexes[1]].playerAddress;
                        openGames[gameID].state = GameStates.CHECKING_WINNER;
                        RequestWinnerBoard(gameID, openGames[gameID].winner);
                        */
                        TestWinner(gameID, openGames[gameID].players[indexes[1]].playerAddress);
                        return;
                    }
                }   
            }
            // rotate state
            openGames[gameID].state == GameStates.P1_CHECKING ? openGames[gameID].state = GameStates.P1_FIRING : openGames[gameID].state = GameStates.P0_FIRING;
            emit ShotsChecked(gameID, location, isHit, true);
        } else {
            // else we emit a 'shot failed to validate' message
            // keep in mind the foul for this user is NOT triggered automatically.
            emit ShotsChecked(gameID, location, isHit, false);
        }
    }

    // this function generates a node locally in the same way a client would generate it
    // it could be internal, we keep it public for now for debug purposes
    function GenLeafNode(uint8 tile, bool ship) pure public returns (bytes32) {
        return keccak256(abi.encode(tile,ship));
    }

    // a player who sees their address here will need to call VerifyWinner
    function RequestWinnerBoard(uint gameID, address winnerAddress) private {
        emit RequestBoard(gameID, winnerAddress);
    }

    // sadly using our modifiers here runs into a stack too deep compilation issue
    // ergo we must assert a few security values by hand
    // yes, the 'tiles' array is completely useless but we will leave it there for now
    // it could be useful for future expansions into 5d battleships
    function VerifyWinner(
    uint gameID,  
    uint8[] calldata tiles,
    bool[] calldata ships,
    bytes32[] calldata nodes,
    bytes32[][] calldata proofs,
    bytes32 root
    ) public {
        uint winnerIndex;
        assert(openGames[gameID].valid);
        assert(openGames[gameID].state == GameStates.CHECKING_WINNER);
        if(openGames[gameID].winner == openGames[gameID].players[0].playerAddress){
            winnerIndex = 0;
        } else {
            winnerIndex = 1;
        }
        assert(openGames[gameID].winner == msg.sender);
        assert(root == openGames[gameID].players[winnerIndex].boardTreeRoot);
        assert(tiles.length == (BOARD_SIZE*BOARD_SIZE));
        assert(ships.length == (BOARD_SIZE*BOARD_SIZE));
        // First operation: make sure this board really has the required number of ships on it
        // and make sure the winner didn't send us a different board
        // in the same cycle, verify that the node is part of the tree
        // we already made sure this root is the correct one
        uint8 shipsTotal = 0;
        for(uint8 i = 0; i < (BOARD_SIZE*BOARD_SIZE); i++){
            if(ships[i])
                shipsTotal++;
            assert(nodes[i] == GenLeafNode(tiles[i], ships[i]));
            assert(verifyCalldata(proofs[i], root, nodes[i]));
        }
        assert(shipsTotal == NUMBER_OF_SHIP_SQUARES);
        // we don't use a conditional branch to alert the other player, as a Foul has already been triggered.
        openGames[gameID].canPay = true;
        openGames[gameID].state = GameStates.PAYABLE;
        emit Victory(gameID, msg.sender);
    }

    function WithdrawWinnings(uint gameID) gameExists(gameID) isWinner(gameID) assertState(gameID, GameStates.PAYABLE) external {
        uint amountOwed = openGames[gameID].decidedStake*2;
        openGames[gameID].state = GameStates.DONE;
        (bool success, ) = msg.sender.call{value:amountOwed}("");
        require(success);
    }

    // TODO: Unit test everything below this

    // a player can accuse another player of being afk if they don't act within X blocks
    // for this to happen, the state has to be one they don't control
    function FoulAccusation(uint gameID) gameExists(gameID) public {
        uint senderIndex;
        if(msg.sender == openGames[gameID].players[0].playerAddress)
            senderIndex = 0;
        else if (msg.sender == openGames[gameID].players[1].playerAddress)
            senderIndex = 1;
        // if the game is stuck waiting on Player 1, only accept accusations from Player 0
        if(openGames[gameID].state == GameStates.P1_FIRING || openGames[gameID].state == GameStates.P1_CHECKING){
            assert(senderIndex == 0);
        // if the game is stuck waiting on Player 0, only accept accusations from Player 1
        } else if (openGames[gameID].state == GameStates.P0_FIRING || openGames[gameID].state == GameStates.P0_CHECKING){
            assert(senderIndex == 1);
        } 
        // if the game is stuck accepting payments, only accept accusations by the side which hasn't paid yet
        else if(openGames[gameID].state == GameStates.ACCEPTING_PAYMENT){
            assert(openGames[gameID].players[senderIndex].hasPaidStake);
        }
        // if the game is stuck checking the winner, because a user isn't providing their board, only accept fouls from the non-winner
        else if(openGames[gameID].state == GameStates.CHECKING_WINNER)
            assert(msg.sender != openGames[gameID].winner);
        else {
            assert(false);
        }
        
        require(openGames[gameID].accuser == address(0));
        // very important: this is the only place where accuser can be set to anything other than 0
        openGames[gameID].accuser = msg.sender;
        openGames[gameID].blockNumber = block.number;
        emit Foul(gameID, openGames[gameID].players[1 - senderIndex].playerAddress, openGames[gameID].blockNumber);
    }

    function CheckFoulTimer(uint gameID) gameExists(gameID) isInGame(gameID) public {
        require(openGames[gameID].accuser != address(0));
        if(openGames[gameID].blockNumber < (block.number + foulBlockLen)){
            // the other player abandoned this game
            TestWinner(gameID, openGames[gameID].accuser);
        }
    }

    // a foul can only be cleared by properly advancing the state
    // thus this function has to be called from within our check/fire functions
    function ClearFoul(uint gameID) private {
        if(openGames[gameID].accuser != address(0) && openGames[gameID].accuser != msg.sender){
            // if we are out of time to context the foul this function will fail
            assert(openGames[gameID].blockNumber <= (block.number + foulBlockLen));
            // else it will clear the foul
            // just like setting the accuser, this is THE ONLY place in the contract where this assignment is made.
            openGames[gameID].accuser = address(0);
        }
    }

    // Assortment of debug functions
    // These functions HAVE to be removed before final deployment
    // the only reason they don't have an owner only modifier or inner assertion to the same effect is that we are ENTIRELY out of room
    // this is as fat as the compiled contract can ever be

    function ChangeState(uint gameID, GameStates state) public {
        openGames[gameID].state = state;
    }

    function SetWinner(uint gameID, address winner) public {
        openGames[gameID].winner = winner;
    }
}