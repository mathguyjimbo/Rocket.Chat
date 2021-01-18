import { canAccessRoomAsync } from '../../../authorization/server/functions/canAccessRoom';
import { Rooms, Messages, Users, Subscriptions } from '../../../models/server/raw';
import { getValue } from '../../../settings/server/raw';
import { Message } from '../../../../server/sdk';

export async function findMentionedMessages({ uid, roomId, pagination: { offset, count, sort } }) {
	const room = await Rooms.findOneById(roomId);
	if (!await canAccessRoomAsync(room, { _id: uid })) {
		throw new Error('error-not-allowed');
	}
	const user = await Users.findOneById(uid, { fields: { username: 1 } });
	if (!user) {
		throw new Error('invalid-user');
	}

	const oldest = Subscriptions.findOneByRoomIdAndUserId(roomId, uid).ts;
	const messages = Promise.await(Message.get(uid, {
		rid: roomId,
		oldest,
		queryOptions: {
			sort: sort || { ts: -1 },
			skip: offset,
			limit: count,
		},
	}));

	const total = messages.length;

	return {
		messages,
		count: messages.length,
		offset,
		total,
	};
}

export async function findStarredMessages({ uid, roomId, pagination: { offset, count, sort } }) {
	const room = await Rooms.findOneById(roomId);
	if (!await canAccessRoomAsync(room, { _id: uid })) {
		throw new Error('error-not-allowed');
	}
	const user = await Users.findOneById(uid, { fields: { username: 1 } });
	if (!user) {
		throw new Error('invalid-user');
	}

	const cursor = await Messages.findStarredByUserAtRoom(uid, roomId, {
		sort: sort || { ts: -1 },
		skip: offset,
		limit: count,
	});

	const total = await cursor.count();

	const messages = await cursor.toArray();

	return {
		messages,
		count: messages.length,
		offset,
		total,
	};
}

export async function findSnippetedMessageById({ uid, messageId }) {
	if (!await getValue('Message_AllowSnippeting')) {
		throw new Error('error-not-allowed');
	}

	if (!uid) {
		throw new Error('invalid-user');
	}

	const snippet = await Messages.findOne({ _id: messageId, snippeted: true });

	if (!snippet) {
		throw new Error('invalid-message');
	}

	const room = await Rooms.findOneById(snippet.rid);

	if (!room) {
		throw new Error('invalid-message');
	}

	if (!await canAccessRoomAsync(room, { _id: uid })) {
		throw new Error('error-not-allowed');
	}

	return {
		message: snippet,
	};
}

export async function findSnippetedMessages({ uid, roomId, pagination: { offset, count, sort } }) {
	if (!await getValue('Message_AllowSnippeting')) {
		throw new Error('error-not-allowed');
	}
	const room = await Rooms.findOneById(roomId);

	if (!await canAccessRoomAsync(room, { _id: uid })) {
		throw new Error('error-not-allowed');
	}

	// TODO apply logic for history visibility
	const queryOptions = {
		sort: sort || { ts: -1 },
		skip: offset,
		limit: count,
	};

	const messages = Promise.await(Message.get(uid, { queryOptions }));

	return {
		messages,
		count: messages.length,
		offset,
		total,
	};
}

export async function findDiscussionsFromRoom({ uid, roomId, text, pagination: { offset, count, sort } }) {
	const room = await Rooms.findOneById(roomId);

	if (!await canAccessRoomAsync(room, { _id: uid })) {
		throw new Error('error-not-allowed');
	}

	// TODO apply logic for history visibility
	const cursor = Messages.findDiscussionsByRoomAndText(roomId, text, {
		sort: sort || { ts: -1 },
		skip: offset,
		limit: count,
	});

	const total = await cursor.count();

	const messages = await cursor.toArray();

	return {
		messages,
		count: messages.length,
		offset,
		total,
	};
}
