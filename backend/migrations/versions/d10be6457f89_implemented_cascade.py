"""Implemented Cascade

Revision ID: d10be6457f89
Revises: e8ea94b1a90f
Create Date: 2024-11-19 01:07:06.949575

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd10be6457f89'
down_revision = 'e8ea94b1a90f'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('controls', schema=None) as batch_op:
        batch_op.drop_constraint('controls_ibfk_1', type_='foreignkey')
        batch_op.create_foreign_key(None, 'simulations', ['simulation_id'], ['id'], ondelete='CASCADE')

    with op.batch_alter_table('sensors', schema=None) as batch_op:
        batch_op.drop_constraint('sensors_ibfk_1', type_='foreignkey')
        batch_op.create_foreign_key(None, 'simulations', ['simulation_id'], ['id'], ondelete='CASCADE')

    with op.batch_alter_table('simulation_results', schema=None) as batch_op:
        batch_op.drop_constraint('simulation_results_ibfk_2', type_='foreignkey')
        batch_op.drop_constraint('simulation_results_ibfk_1', type_='foreignkey')
        batch_op.create_foreign_key(None, 'simulations', ['simulation_id'], ['id'], ondelete='CASCADE')
        batch_op.create_foreign_key(None, 'users', ['user_id'], ['id'], ondelete='CASCADE')

    with op.batch_alter_table('simulations', schema=None) as batch_op:
        batch_op.drop_constraint('simulations_ibfk_1', type_='foreignkey')
        batch_op.create_foreign_key(None, 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('simulations', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key('simulations_ibfk_1', 'users', ['user_id'], ['id'])

    with op.batch_alter_table('simulation_results', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key('simulation_results_ibfk_1', 'simulations', ['simulation_id'], ['id'])
        batch_op.create_foreign_key('simulation_results_ibfk_2', 'users', ['user_id'], ['id'])

    with op.batch_alter_table('sensors', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key('sensors_ibfk_1', 'simulations', ['simulation_id'], ['id'])

    with op.batch_alter_table('controls', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key('controls_ibfk_1', 'simulations', ['simulation_id'], ['id'])

    # ### end Alembic commands ###
