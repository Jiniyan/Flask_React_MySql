"""empty message

Revision ID: 67d754147c3c
Revises: 2d48341e5d76
Create Date: 2024-11-22 19:02:22.238692

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '67d754147c3c'
down_revision = '2d48341e5d76'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('simulation_results', schema=None) as batch_op:
        batch_op.alter_column('duration',
               existing_type=mysql.FLOAT(),
               type_=sa.String(length=50),
               existing_nullable=False)

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('simulation_results', schema=None) as batch_op:
        batch_op.alter_column('duration',
               existing_type=sa.String(length=50),
               type_=mysql.FLOAT(),
               existing_nullable=False)

    # ### end Alembic commands ###