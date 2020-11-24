import json
import boto3
from datetime import datetime
from boto3.dynamodb.conditions import Key
import base64

s3 = boto3.resource('s3')
bucket = '1m-shiritori'

dynamodb = boto3.resource('dynamodb')
table    = dynamodb.Table('1m-shiritori-db')

def lambda_handler(event, context):
    key = event.get('key', '')
    if key:
        try:
            res = s3.Object(bucket, key).get()['Body'].read()
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "image/png"},
                "isBase64Encoded": True,
                "body": res
              };
            # return {'statusCode': 200, 'body': res, 'test': key}
            
        except Exception as e:
            print(e)
            return {'statusCode': 404, 'body': f'no image found: {key}', 'test': response}
    
    return {'statusCode': 404, 'body': 'key is not defined'}
