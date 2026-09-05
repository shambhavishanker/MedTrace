from flask import Blueprint, render_template

dashboard3 = Blueprint(
    "dashboard3",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/dashboard3/static"
)


@dashboard3.route("/predictive-risk")
def predictive_risk():
    return render_template("dashboard3.html")