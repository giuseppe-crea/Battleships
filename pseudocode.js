// these 'objects are actually all structs, work accordingly

Game object:
	players<address, Player>
	state = uint 4 // 0: waiting; 1: setting stake; 2: placing ships; 3: player[0] firing turn; 4: player[1] response turn; 5: player[1] firing turn; 6: player[0] response turn; 7: done
	address Host
	block_id foultimer // used to count down 5 blocks in case of cheating or dc. 
	address accuser // who will be paid if foultimer is > 5 blocks and non-zero
	// maybe a 'private' value for games which can't be joined at random?

Player object:
	proposedStake = uint 256
	address
	board = merkle tree root
	shots_board = Board object
	
Board object:
	// stores shot result for this player's board
	// 0 = miss; 1 = hit
	N*N matrix of bits // ideally sparse
	total_ship_pieces = uint 64

Game Contract: {
	Open_games<gameId, Game>
	Full_games<gameId, Game>
	
	Create_game(){
		generate random gameId
		game = new Game
		game.Host = msg.sender
		player_zero = new Player(msg.sender)
		put player_zero in game.players
		put game in Open_games with id gameId
		return gameId
	}
	
	Join_game(optional: gameId){
		if gameId is None:
			// first issue: what if I want to start a private game? check private value in game?
			gameId = pick a game at random from Open_games
		else
			assert gameId in Open_games
		assert gameId.state == 0
		move gameId into Full_games // this could be very costly, might want to have only one array and rely on status
		player_one = new Player(msg.sender)
		put player_one in gameId.players
		set gameId.state = 1
		emit start event for gameId
	}
	
	Propose_stake(value: uint 256, gameId: uint 64){
		// basic safety precautions
		assert gameId in Full_games
		assert msg.sender in gameId.players
		assert gameId.stake is not None // ???
		assert gameId.state == 1
		// see if this player's opponent has already proposed a stake
		playerIndex = find index of msg.sender in gameId.players
		opponentIndex = playerIndex ? 0 : 1
		if gameId.players[opponentIndex].proposedStake == value
			set gameId.state = 2
			emit event "stake set to ${value}"
			// should actually take money from players now
			return
		else gameId.players[playerIndex].proposedStake = value
		// player should answer with another propose_stake transaction
		emit event for gameId.players[opponentIndex] asking if value is okay as a stake
		return
	}

	Pay_stake(){
		
	}
	
	Place_ships(merkle tree root, gameId){
		assert msg.sender in gameId.players
		assert state == 2
		assert board of gameId.players[msg.sender]is empty
		set gameId.players[msg.sender].board = merkle tree root
		// the number of ship pieces total is pre-defined and can't be changed
		set gameId.players[msg.sender].shots_board.total_ship_pieces = default_value
		if all players have boards != empty:
			gameId.state = 3
			emit event "Round One!"
		return
	}
	
	Fire_Torpedo(location, gameId){
		assert msg.sender in gameId.players
		assert ((state == 3 and msg.sender == host) or (state == 5 and msg.sender != host))
		move state to state +1
		emit event for opponent of msg.sender "shots were fired on ${location}, were you hit?"
	}
	
	Verify_hit(proof, claim, gameId){
		assert msg.sender in gameId.players
		assert ((state == 4 and msg.sender != host) or (state == 6 and msg.sender == host))
		assert (verify claim with proof over msg.sender board)
		// Store the shot result in game state
		gameId.players[msg.sender].shots_board[location] = claim
		// check if the game is over
		if claim == 1:
			msg.sender shots_board.total_ship_pieces -= 1
			reply_msg = "you hit!"
			if msg.sender shots_board.total_ship_pieces <= 0:
				state == 7
				emit event for msg.sender "You lose!"
				// upon receiving the victory event the winner will be required to supply their board within 5 blocks
				emit event for msg.sender opponent "You win!"
				// block timestamp is unreliable, check for better way to measure block #
				gameId.foultimer = block.timestamp
				gameId.accuser = msg.sender
		else:
			reply_msg = "you miss!"
		// else go into next turn
		if state == 4:
			state = 5
		if state == 6:
			state = 3
		emit event for msg.sender opponent "${reply_msg}"
	}
	
	// needs to verify legality of pieces on the board of the victor
	Verify_victor
	
	// afk accusation should only happen when the game is in phases 2 through 6
	Foulplay_accusation
	
	// payout function should take penalty into account
	Payout
}