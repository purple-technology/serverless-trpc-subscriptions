import "aws-sdk-client-mock-jest";
import { test, expect, beforeEach, vi, afterEach } from "vitest";
import { connect } from "./connect.adaptor";
import { dynamodb } from "./connect.dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyWebsocketEventV2, Context } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ConnectionByConnectionId } from "../dynamodb/table";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

test("when websocket connection is established it is put into dynamodb", async () => {
  const tableName = "tableName";
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);

  dynamoDBClientMock.on(PutCommand).resolves({});

  const handler = connect({
    store: dynamodb({
      tableName,
      dynamoDBClient,
    }),
  });

  const event = {
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  expect(await handler(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  const connection: ConnectionByConnectionId = {
    pk: `connection#${event.requestContext.connectionId}`,
    sk: `connection#${event.requestContext.connectionId}`,
    type: "connection",
    expireAt: 14400,
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    TableName: tableName,
    Item: connection,
  });
});
